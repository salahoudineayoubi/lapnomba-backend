import fs from "fs";
import path from "path";
import crypto from "crypto";
import { uploadFromBase64 } from "../../../../utils/cloudinary";
import { sendMail } from "../../../../utils/sendMail";
import { validateUploadedFile } from "../../../../utils/fileValidation";
import logger from "../../../../utils/logger";

const BASE_URL =
  process.env.APP_BASE_URL || "https://lobster-app-vdl5o.ondigitalocean.app";

const ALLOWED_PHOTO_MIMES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_CV_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 Mo
const MAX_CV_BYTES = 8 * 1024 * 1024; // 8 Mo

/**
 * Gère l'upload des fichiers.
 * Photo -> Cloudinary (validée : type réel + taille avant envoi)
 * CV -> Stockage local (validé : type réel + taille avant écriture)
 *
 * Ni l'extension ni le Content-Type déclaré par le client ne sont fiables :
 * le type réel est détecté via signature binaire (voir utils/fileValidation).
 * Un fichier invalide fait échouer explicitement la candidature plutôt que
 * d'être silencieusement ignoré.
 */
export const handleFileUploads = async (input: any) => {
  let photoUrl = input.photo;
  let cvUrl = input.cv;

  if (photoUrl && typeof photoUrl === "string" && photoUrl.startsWith("data:")) {
    validateUploadedFile(photoUrl, {
      allowedMimes: ALLOWED_PHOTO_MIMES,
      maxBytes: MAX_PHOTO_BYTES,
      label: "Photo",
    });

    const res = await uploadFromBase64(photoUrl, {
      folder: "candidatures/photos",
      resource_type: "image",
    });

    photoUrl = res.secure_url;
  }

  if (cvUrl && typeof cvUrl === "string" && cvUrl.startsWith("data:")) {
    const detected = validateUploadedFile(cvUrl, {
      allowedMimes: ALLOWED_CV_MIMES,
      maxBytes: MAX_CV_BYTES,
      label: "CV",
    });

    const base64Data = cvUrl.split(";base64,").pop();
    // Nom de fichier généré côté serveur (jamais dérivé d'une entrée client)
    const fileName = `cv-${Date.now()}-${crypto.randomUUID()}.${detected.extension}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "cv");
    const filePath = path.join(uploadDir, fileName);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(filePath, base64Data!, { encoding: "base64" });

    // ✅ URL complète du backend, sans /graphql
    cvUrl = `${BASE_URL}/uploads/cv/${fileName}`;
  }

  // Toute valeur restante qui n'est ni une data URI traitée, ni déjà une URL
  // http(s) existante, est ignorée (comportement inchangé pour compat).
  if (photoUrl && !photoUrl.startsWith("http")) {
    photoUrl = null;
  }

  if (cvUrl && !cvUrl.startsWith("http")) {
    cvUrl = null;
  }

  return { photoUrl, cvUrl };
};

/**
 * Échappe les caractères HTML spéciaux pour éviter toute injection dans le
 * template (nom, motif de refus... sont du texte libre non fiable).
 */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildCandidateStatusMail = (
  type: "CONFIRMATION" | "APPROBATION" | "REFUS",
  nom: string,
  motifRefus?: string
): { subject: string; text: string; html: string } => {
  // Version texte brut : nom tel quel (pas d'échappement HTML pertinent).
  const plainName = nom?.trim() || "Cher candidat";
  const plainMotif = motifRefus?.trim() || undefined;

  // Version HTML : échappée pour éviter toute injection via un champ libre.
  const safeName = escapeHtml(plainName);
  const safeMotif = plainMotif ? escapeHtml(plainMotif) : undefined;

  const motifTextBlock = plainMotif
    ? `\n\nMotif communiqué par notre équipe :\n${plainMotif}`
    : "";

  const motifHtmlBlock = safeMotif
    ? `
          <p style="margin-top: 16px; padding: 12px 16px; background: #F9FAFB; border-left: 3px solid #9CA3AF; border-radius: 4px;">
            <strong>Motif communiqué par notre équipe :</strong><br />
            ${safeMotif}
          </p>`
    : "";

  const messages = {
    CONFIRMATION: {
      subject: "Accusé de réception de votre candidature - Fondation Lap Nomba",
      text: `Bonjour ${plainName},

Nous vous confirmons la bonne réception de votre dossier de candidature.

Notre équipe procède actuellement à l’examen de votre profil ainsi qu’à l’évaluation des éléments transmis.

Nous vous remercions pour l’intérêt porté à la mission de la Fondation Lap Nomba et reviendrons vers vous très prochainement.

Cordialement,
La Direction de la Formation
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Accusé de réception de votre candidature</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous vous confirmons la bonne réception de votre dossier de candidature.
          </p>
          <p>
            Notre équipe procède actuellement à l’examen de votre profil ainsi qu’à
            l’évaluation des éléments transmis.
          </p>
          <p>
            Nous vous remercions pour l’intérêt porté à la mission de la
            <strong>Fondation Lap Nomba</strong> et reviendrons vers vous très prochainement.
          </p>
          <p>
            Cordialement,<br />
            <strong>La Direction de la Formation</strong><br />
            Fondation Lap Nomba
          </p>
        </div>
      `,
    },

    APPROBATION: {
      subject: "Validation de votre candidature - Fondation Lap Nomba",
      text: `Bonjour ${plainName},

Nous avons le plaisir de vous informer que votre candidature a été approuvée.

Vous pouvez désormais contacter notre équipe sur WhatsApp pour rejoindre votre groupe de formation et recevoir les prochaines consignes :

https://wa.me/237672018999

Nous vous félicitons pour cette étape et vous souhaitons la bienvenue au sein de l’écosystème de la Fondation Lap Nomba.

Cordialement,
La Direction de la Formation
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Validation de votre candidature</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous avons le plaisir de vous informer que votre candidature a été approuvée.
          </p>
          <p>
            Vous pouvez désormais contacter notre équipe sur WhatsApp pour rejoindre
            votre groupe de formation et recevoir les prochaines consignes :
          </p>
          <p>
            <a href="https://wa.me/237672018999">https://wa.me/237672018999</a>
          </p>
          <p>
            Nous vous félicitons pour cette étape et vous souhaitons la bienvenue au sein
            de l’écosystème de la <strong>Fondation Lap Nomba</strong>.
          </p>
          <p>
            Cordialement,<br />
            <strong>La Direction de la Formation</strong><br />
            Fondation Lap Nomba
          </p>
        </div>
      `,
    },

    REFUS: {
      subject: "Décision concernant votre candidature - Fondation Lap Nomba",
      text: `Bonjour ${plainName},

Après examen attentif de votre dossier, nous sommes au regret de vous informer que nous ne pouvons pas donner une suite favorable à votre candidature pour cette session.

Nous vous remercions pour l’intérêt accordé à nos programmes et vous encourageons à poursuivre vos efforts dans votre parcours.${motifTextBlock}

Cordialement,
La Direction de la Formation
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Décision concernant votre candidature</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Après examen attentif de votre dossier, nous sommes au regret de vous
            informer que nous ne pouvons pas donner une suite favorable à votre
            candidature pour cette session.
          </p>
          <p>
            Nous vous remercions pour l’intérêt accordé à nos programmes et vous
            encourageons à poursuivre vos efforts dans votre parcours.
          </p>${motifHtmlBlock}
          <p>
            Cordialement,<br />
            <strong>La Direction de la Formation</strong><br />
            Fondation Lap Nomba
          </p>
        </div>
      `,
    },
  };

  return messages[type];
};

/**
 * Gère l'envoi des emails transactionnels.
 *
 * Ne doit JAMAIS faire échouer/annuler l'opération métier appelante :
 * l'erreur est capturée et loggée, jamais propagée. Le statut en base
 * (déjà écrit avant l'appel) reste la source de vérité — un échec SMTP
 * ne doit ni revenir en arrière, ni bloquer la réponse API.
 */
export const sendStatusEmail = async (
  email: string,
  nom: string,
  type: "CONFIRMATION" | "APPROBATION" | "REFUS",
  motifRefus?: string
) => {
  try {
    const { subject, text, html } = buildCandidateStatusMail(type, nom, motifRefus);

    await sendMail({
      to: email,
      subject,
      text,
      html,
    });
  } catch (error) {
    logger.error(`Échec de l'envoi de l'email (${type}) à ${email}`, {
      type,
      error: error instanceof Error ? error.message : error,
    });
  }
};