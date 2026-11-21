/**
 * Admissions v2 — session de candidature : code e-mail, jeton, brouillon,
 * pièces d'identité privées.
 */
import crypto from "crypto";
import { ApolloError, UserInputError } from "apollo-server-express";

import { ApplicationSession, IApplicationSession, IdentityDocKind } from "../../../models/applicationSession";
import Candidature from "../../../models/candidature";
import { sendMail } from "../../../utils/sendMail";
import logger from "../../../utils/logger";
import { checkRateLimit } from "../../../utils/rateLimiter";
import { isDisposableEmail, verifyTurnstile } from "../../../utils/antiAbuse";
import { deletePrivateFile, uploadPrivateDataUri } from "../../../utils/privateFiles";
import { validateUploadedFile } from "../../../utils/fileValidation";
import { validateEmail } from "../candidature/mutation/candidature.validation";
import { buildSupportFooterHtml, buildSupportFooterText } from "../../../utils/emailSupport";

const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_MAX_ATTEMPTS = 5;
const CODE_COOLDOWN_MS = 60 * 1000;
const CODES_PER_HOUR = 5;
const TOKEN_TTL_MS = 30 * 24 * 3600 * 1000;
const MAX_DRAFT_CHARS = 60000;
const MAX_ID_IMAGE_BYTES = 6 * 1024 * 1024;

const pepper = () => process.env.ADMISSIONS_SECRET || process.env.JWT_SECRET || "lapnomba-admissions";
const hmac = (value: string) => crypto.createHmac("sha256", pepper()).update(value).digest("hex");
const safeEqual = (a: string, b: string) =>
  a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const hashIdentityNumber = (normalized: string) => hmac(`id:${normalized}`);

export class SessionError extends ApolloError {
  constructor(message: string, code = "INVALID_SESSION") {
    super(message, code);
  }
}

/** Retrouve la session à partir du jeton opaque remis après vérification de l'e-mail. */
export const getSessionByToken = async (token?: string | null): Promise<IApplicationSession> => {
  if (!token || typeof token !== "string" || token.length < 20) {
    throw new SessionError("Session expirée. Vérifiez de nouveau votre adresse e-mail.");
  }
  const session = await ApplicationSession.findOne({ tokenHash: hmac(`token:${token}`) });
  if (!session || !session.verifiedAt || !session.tokenExpiresAt || session.tokenExpiresAt < new Date()) {
    throw new SessionError("Session expirée. Vérifiez de nouveau votre adresse e-mail.");
  }
  return session;
};

const ensureNotSubmitted = (session: IApplicationSession) => {
  if (session.submittedCandidatureId) {
    throw new ApolloError("Votre candidature a déjà été envoyée.", "ALREADY_SUBMITTED");
  }
};

const codeEmail = (code: string) => {
  const subject = `${code} — votre code de vérification Lap Nomba`;
  const text = `Bonjour,

Votre code de vérification pour candidater à la Fondation Lap Nomba : ${code}

Il est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.

Fondation Lap Nomba — Sensibiliser. Former. Intégrer.` + buildSupportFooterText();
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827; max-width: 520px;">
      <h2 style="margin: 0 0 12px;">Votre code de vérification</h2>
      <p>Pour poursuivre votre candidature à la Fondation Lap Nomba, saisissez ce code :</p>
      <p style="font-size: 34px; font-weight: bold; letter-spacing: 8px; margin: 18px 0; color: #2836C4;">${code}</p>
      <p style="color: #6B7280;">Il est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
      ${buildSupportFooterHtml()}
    </div>`;
  return { subject, text, html };
};

export const requestApplicationCode = async (
  _: any,
  { email, captchaToken, website }: { email: string; captchaToken?: string; website?: string },
  context?: { ip?: string }
) => {
  // Champ piège invisible : un humain ne le remplit jamais. On répond « OK » sans rien faire.
  if (website && website.trim()) return true;

  let normalized: string;
  try {
    normalized = validateEmail(email);
  } catch {
    throw new UserInputError("Adresse e-mail invalide.", { reason: "INVALID_EMAIL" });
  }
  if (isDisposableEmail(normalized)) {
    throw new UserInputError(
      "Les adresses e-mail temporaires ne sont pas acceptées. Utilisez votre adresse personnelle.",
      { reason: "DISPOSABLE_EMAIL" }
    );
  }
  if (context?.ip) checkRateLimit(`appCode:${context.ip}`, { maxRequests: 10, windowMs: 3600 * 1000 });

  if (!(await verifyTurnstile(captchaToken, context?.ip))) {
    throw new UserInputError("Vérification anti-robot échouée. Rechargez la page et réessayez.", { reason: "CAPTCHA" });
  }

  const existing = await Candidature.exists({ email: normalized, deletedAt: null });
  if (existing) {
    throw new UserInputError("Une candidature a déjà été envoyée avec cette adresse e-mail.", { reason: "ALREADY_APPLIED" });
  }

  const now = Date.now();
  let session = await ApplicationSession.findOne({ email: normalized, submittedCandidatureId: { $exists: false } }).sort({ createdAt: -1 });
  if (!session) session = new ApplicationSession({ email: normalized, ip: context?.ip });

  const recent = (session.codesSent || []).filter((c) => now - new Date(c.at).getTime() < 3600 * 1000);
  const last = recent[recent.length - 1];
  if (last && now - new Date(last.at).getTime() < CODE_COOLDOWN_MS) {
    throw new UserInputError("Un code vient d'être envoyé. Patientez une minute avant d'en demander un autre.", { reason: "COOLDOWN" });
  }
  if (recent.length >= CODES_PER_HOUR) {
    throw new UserInputError("Trop de codes demandés. Réessayez dans une heure.", { reason: "TOO_MANY_CODES" });
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  session.codeHash = hmac(`code:${normalized}:${code}`);
  session.codeExpiresAt = new Date(now + CODE_TTL_MS);
  session.codeAttempts = 0;
  session.codesSent = [...recent, { at: new Date(now) }];
  await session.save();

  const mail = codeEmail(code);
  try {
    await sendMail({ to: normalized, ...mail });
  } catch (err) {
    logger.error("Échec d'envoi du code de vérification", { error: err instanceof Error ? err.message : err });
    throw new ApolloError("L'e-mail n'a pas pu être envoyé. Réessayez dans un instant.", "EMAIL_SEND_FAILED");
  }
  return true;
};

export const verifyApplicationCode = async (_: any, { email, code }: { email: string; code: string }) => {
  const normalized = (email || "").trim().toLowerCase();
  const session = await ApplicationSession.findOne({ email: normalized, submittedCandidatureId: { $exists: false } }).sort({ createdAt: -1 });
  const generic = new UserInputError("Code incorrect ou expiré.", { reason: "INVALID_CODE" });
  if (!session || !session.codeHash || !session.codeExpiresAt) throw generic;
  if (session.codeExpiresAt < new Date()) throw new UserInputError("Ce code a expiré. Demandez-en un nouveau.", { reason: "CODE_EXPIRED" });
  if (session.codeAttempts >= CODE_MAX_ATTEMPTS) {
    throw new UserInputError("Trop d'essais. Demandez un nouveau code.", { reason: "TOO_MANY_ATTEMPTS" });
  }
  const clean = String(code || "").replace(/\D/g, "");
  if (!safeEqual(hmac(`code:${normalized}:${clean}`), session.codeHash)) {
    session.codeAttempts += 1;
    await session.save();
    throw generic;
  }
  const token = crypto.randomBytes(32).toString("base64url");
  session.tokenHash = hmac(`token:${token}`);
  session.tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  session.verifiedAt = session.verifiedAt || new Date();
  session.codeHash = undefined;
  session.codeExpiresAt = undefined;
  await session.save();
  return token;
};

export const applicationSession = async (_: any, { token }: { token: string }) => {
  const s = await getSessionByToken(token);
  const a = s.aptitude;
  return {
    email: s.email,
    draft: s.draft || null,
    documents: {
      front: !!s.documents?.front,
      back: !!s.documents?.back,
      selfie: !!s.documents?.selfie,
      guardian: !!s.documents?.guardian,
      birth: !!s.documents?.birth,
    },
    aptitudeStatus: !a?.startedAt ? "NOT_STARTED" : a.submittedAt ? "DONE" : "IN_PROGRESS",
    aptitudeEndsAt: a?.endsAt ? a.endsAt.toISOString() : null,
    submitted: !!s.submittedCandidatureId,
    verifiedAt: s.verifiedAt?.toISOString() ?? null,
  };
};

export const saveApplicationDraft = async (_: any, { token, draft }: { token: string; draft: string }) => {
  const s = await getSessionByToken(token);
  ensureNotSubmitted(s);
  if (typeof draft !== "string" || draft.length > MAX_DRAFT_CHARS) {
    throw new UserInputError("Brouillon trop volumineux.");
  }
  try {
    JSON.parse(draft);
  } catch {
    throw new UserInputError("Brouillon invalide.");
  }
  s.draft = draft;
  await s.save();
  return true;
};

const DOC_KINDS: IdentityDocKind[] = ["front", "back", "selfie", "guardian", "birth"];
const DOC_LABELS: Record<IdentityDocKind, string> = {
  front: "Pièce d'identité (recto)",
  back: "Pièce d'identité (verso)",
  selfie: "Selfie",
  guardian: "Pièce d'identité du parent ou tuteur",
  birth: "Acte de naissance ou carte scolaire",
};

export const uploadIdentityDocument = async (
  _: any,
  { token, kind, file }: { token: string; kind: IdentityDocKind; file: string },
  context?: { ip?: string }
) => {
  const s = await getSessionByToken(token);
  ensureNotSubmitted(s);
  if (!DOC_KINDS.includes(kind)) throw new UserInputError("Type de document inconnu.");
  if (context?.ip) checkRateLimit(`idDoc:${context.ip}`, { maxRequests: 40, windowMs: 3600 * 1000 });

  const detected = validateUploadedFile(file, {
    allowedMimes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: MAX_ID_IMAGE_BYTES,
    label: DOC_LABELS[kind],
  });

  const ref = await uploadPrivateDataUri(file, {
    folder: `admissions/identite/${s._id}`,
    resourceType: "image",
    format: "jpg",
  });
  const previous = s.documents?.[kind];
  s.documents = { ...(s.documents || {}), [kind]: ref };
  s.markModified("documents");
  await s.save();
  if (previous) deletePrivateFile(previous).catch(() => undefined);
  logger.info("Pièce d'identité reçue (session admissions)", { kind, mime: detected.mime });
  return true;
};
