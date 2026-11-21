import fs from "fs";
import path from "path";
import nodemailer, { Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import type Mail from "nodemailer/lib/mailer";
import logger from "../logger";
import { getDefaultReplyTo } from "../emailSupport";

type SendMailParams = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  /**
   * Remplace le Reply-To par défaut (contact@lapnomba.org). Réservé aux cas
   * genuinement particuliers — un email automatique standard n'a jamais
   * besoin de le fournir, voir DEFAULT_REPLY_TO ci-dessous.
   */
  replyTo?: string;
  /** Pièces jointes (ex: reçu PDF) — voir utils/receipt.ts. */
  attachments?: Mail.Attachment[];
};

/**
 * Configuration SMTP — 100% pilotée par variables d'environnement.
 * Aucun mot de passe, aucun host/utilisateur institutionnel codé en dur.
 *
 * SMTP_HOST, SMTP_USER, SMTP_PASS sont obligatoires pour envoyer un email :
 * c'est l'identité d'AUTHENTIFICATION SMTP, distincte de l'identité
 * affichée dans "From". SMTP_PORT par défaut à 465 (valeur technique, pas
 * un secret).
 *
 * SMTP_FROM_NAME / SMTP_FROM_EMAIL pilotent l'expéditeur "From" affiché à
 * TOUS les destinataires (candidat, support, équipe interne...) — cette
 * valeur doit être noreply@lapnomba.org en production (voir .env.example).
 * À défaut de SMTP_FROM_EMAIL, on retombe sur SMTP_USER (la boîte qui
 * authentifie) plutôt que d'inventer une adresse : si le serveur mail exige
 * que la boîte authentifiée corresponde à "From", ou si noreply@lapnomba.org
 * n'est pas encore une boîte/alias autorisé côté serveur, ce repli l'expose
 * clairement au lieu de faire semblant d'envoyer depuis noreply (voir
 * rapport — "Deployment Requirements").
 */
const getMailConfig = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 465;

  if (!host || !user || !pass) {
    throw new Error(
      "Configuration SMTP incomplète : SMTP_HOST, SMTP_USER et SMTP_PASS doivent être définis (variables d'environnement)."
    );
  }

  const fromName = process.env.SMTP_FROM_NAME || "Lap Nomba Foundation";
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;

  // Port 465 = SMTPS implicite (secure: true). Tout autre port (587 typiquement)
  // = connexion en clair puis STARTTLS (secure: false, requireTLS: true).
  const secure = port === 465;

  return { host, port, user, pass, fromName, fromEmail, secure };
};

let cachedTransporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

/**
 * Transporter nodemailer réutilisable (lazy singleton).
 * Ne recrée plus une connexion/poignée de main SMTP à chaque email.
 */
const getTransporter = (): Transporter<SMTPTransport.SentMessageInfo> => {
  if (cachedTransporter) return cachedTransporter;

  const { host, port, user, pass, secure } = getMailConfig();

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure, // STARTTLS explicite quand on n'est pas déjà en TLS implicite (465)
    auth: { user, pass },
    tls: {
      // Vérification du certificat activée par défaut. Échappatoire explicite
      // réservée au dev/diagnostic local (jamais silencieuse en production).
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
    },
    connectionTimeout: 30000,
    socketTimeout: 30000,
    family: 4,
  } as SMTPTransport.Options);

  return cachedTransporter;
};

/**
 * Diagnostic — à utiliser au boot ou dans un healthcheck, PAS avant chaque
 * email (voir historique : un `verify()` par envoi doublait inutilement les
 * connexions SMTP). Ne lève jamais : retourne simplement true/false.
 */
export const verifySmtpConnection = async (): Promise<boolean> => {
  try {
    await getTransporter().verify();
    return true;
  } catch (err) {
    logger.error("Échec de la vérification de la connexion SMTP", {
      error: err instanceof Error ? err.message : err,
    });
    return false;
  }
};

/**
 * Point d'envoi unique de tout le backend.
 *
 * "from" n'est délibérément PAS un paramètre exposé à l'appelant : tout
 * email automatique part de la même identité institutionnelle
 * (SMTP_FROM_NAME/SMTP_FROM_EMAIL), pour qu'aucun workflow ne puisse
 * accidentellement envoyer depuis support@/training@/une adresse
 * personnelle (voir "Do not trust callers for From address").
 *
 * "replyTo" a en revanche un défaut centralisé (contact@lapnomba.org, voir
 * utils/emailSupport.ts) mais reste surchargeable pour un besoin
 * opérationnel réel et explicite.
 */
// --- Habillage commun : logo de la fondation en tête de chaque e-mail HTML ---------------
export const LOGO_CID = "logo@lapnomba.org";
let cachedLogo: Buffer | null | undefined;
const getLogo = (): Buffer | null => {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    cachedLogo = fs.readFileSync(path.join(process.cwd(), "src", "assets", "logo_email.png"));
  } catch {
    cachedLogo = null; // pas de logo disponible : l'e-mail part quand même, sans en-tête image
  }
  return cachedLogo;
};

/**
 * Place le contenu dans une carte blanche centrée, précédée du logo (image intégrée au
 * message, « cid: » : elle s'affiche sans dépendre d'un site externe). Les e-mails
 * qui sont déjà des documents complets (<html>) sont laissés tels quels.
 */
export const brandEmailHtml = (html: string, hasLogo = true): string => {
  if (/<html[\s>]/i.test(html) || html.includes(`cid:${LOGO_CID}`)) return html;
  const logo = hasLogo
    ? `<tr><td align="center" style="padding:28px 24px 8px"><img src="cid:${LOGO_CID}" width="96" height="96" alt="Lap Nomba Foundation" style="display:block;border:0;width:96px;height:96px" /></td></tr>`
    : "";
  return `<div style="background:#f3f4f8;padding:24px 12px;margin:0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;border-top:4px solid #4143B7">
${logo}<tr><td style="padding:8px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2937">
${html}
</td></tr></table></div>`;
};

const textToHtml = (text: string): string =>
  `<div style="white-space:normal">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />")}</div>`;

export const sendMail = async ({ to, subject, text, html, replyTo, attachments }: SendMailParams) => {
  const { fromName, fromEmail } = getMailConfig();
  const transporter = getTransporter();
  // E-mail « texte seul » : on fabrique aussi une version HTML pour qu'il porte le logo.
  const sourceHtml = html ?? (text ? textToHtml(text) : undefined);
  const logo = sourceHtml ? getLogo() : null;
  const finalHtml = sourceHtml ? brandEmailHtml(sourceHtml, !!logo) : undefined;
  const usesLogo = !!(logo && finalHtml && finalHtml.includes(`cid:${LOGO_CID}`));

  return await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text,
    html: finalHtml,
    replyTo: replyTo || getDefaultReplyTo(),
    attachments: usesLogo
      ? [...(attachments || []), { filename: "lapnomba-logo.png", content: logo as Buffer, cid: LOGO_CID, contentType: "image/png", contentDisposition: "inline" }]
      : attachments,
  });
};
