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
      subject: "Votre candidature a bien été reçue — Lap Nomba Foundation",
      text: `Bonjour ${plainName},

Nous vous confirmons la bonne réception de votre candidature auprès de Lap Nomba Foundation.

Notre équipe va maintenant examiner attentivement les informations que vous avez transmises.

À l’issue de cette analyse, nous vous contacterons pour vous informer de la suite donnée à votre candidature.

Aucune action supplémentaire n’est nécessaire pour le moment.

Merci pour votre intérêt envers les programmes de Lap Nomba Foundation.

Lap Nomba Foundation
Former. Innover. Transformer.`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Votre candidature a bien été reçue</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous vous confirmons la bonne réception de votre candidature auprès de
            <strong>Lap Nomba Foundation</strong>.
          </p>
          <p>
            Notre équipe va maintenant examiner attentivement les informations que vous avez transmises.
          </p>
          <p>
            À l’issue de cette analyse, nous vous contacterons pour vous informer de la suite
            donnée à votre candidature.
          </p>
          <p>
            Aucune action supplémentaire n’est nécessaire pour le moment.
          </p>
          <p>
            Merci pour votre intérêt envers les programmes de Lap Nomba Foundation.
          </p>
          <p>
            <strong>Lap Nomba Foundation</strong><br />
            <em>Former. Innover. Transformer.</em>
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

const TRAINING_NOTIFICATION_EMAIL =
  process.env.TRAINING_NOTIFICATION_EMAIL || "training@lapnomba.org";

const formatSubmissionDate = (date: Date): string =>
  date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Notification interne — envoyée à l'équipe formation à chaque nouvelle
 * candidature ÉLIGIBLE créée avec succès (jamais pour un candidat >25 ans,
 * puisqu'aucune candidature n'est créée pour ce cas).
 *
 * Résumé opérationnel volontairement compact : ni CV, ni photo, ni
 * motivation/historique personnel — l'admin reste la source de vérité
 * complète. Toute valeur libre fournie par le candidat (nom, formation,
 * ville, pays) est échappée avant insertion HTML.
 *
 * Réutilise le même sendMail que les emails candidat (pas de second
 * transporteur SMTP), et suit la même politique non-bloquante : un échec
 * ici ne remet jamais en cause la candidature déjà enregistrée.
 */
export const sendInternalNotification = async (candidature: any, age: number) => {
  try {
    const nom = escapeHtml(candidature.nomComplet?.trim() || "Candidat");
    const formation = escapeHtml(candidature.choixFormation?.trim() || "—");
    const ville = escapeHtml(candidature.ville?.trim() || "—");
    const pays = escapeHtml(candidature.pays?.trim() || "—");
    const email = escapeHtml(candidature.email || "—");
    const whatsapp = escapeHtml(candidature.numeroWhatsapp || "—");
    const submittedAt = formatSubmissionDate(
      candidature.createdAt ? new Date(candidature.createdAt) : new Date()
    );
    const candidatureId = String(candidature._id || candidature.id || "");

    // Sujet : nom complet non échappé HTML (texte brut) mais nettoyé des
    // sauts de ligne/retours chariot pour empêcher toute injection d'en-tête.
    const safeSubjectName = (candidature.nomComplet || "Candidat")
      .replace(/[\r\n]+/g, " ")
      .trim();

    const subject = `[Admissions] Nouvelle candidature — ${safeSubjectName}`;

    const text = `Nouvelle candidature reçue — Lap Nomba Foundation

Nom complet : ${candidature.nomComplet}
Formation choisie : ${candidature.choixFormation}
Âge : ${age} ans
Ville : ${candidature.ville}
Pays : ${candidature.pays}
Email : ${candidature.email}
WhatsApp : ${candidature.numeroWhatsapp}
Date de soumission : ${submittedAt}
Statut : En attente
Référence candidature : ${candidatureId}

Consultez le tableau de bord admin pour traiter cette candidature.`;

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
        <h2>Nouvelle candidature — ${nom}</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 480px;">
          <tbody>
            <tr><td style="padding: 4px 12px 4px 0; color: #6B7280;">Nom complet</td><td><strong>${nom}</strong></td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #6B7280;">Formation choisie</td><td>${formation}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #6B7280;">Âge</td><td>${age} ans</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #6B7280;">Ville</td><td>${ville}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #6B7280;">Pays</td><td>${pays}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #6B7280;">Email</td><td>${email}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #6B7280;">WhatsApp</td><td>${whatsapp}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #6B7280;">Date de soumission</td><td>${submittedAt}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #6B7280;">Statut</td><td>En attente</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #6B7280;">Référence</td><td><code>${candidatureId}</code></td></tr>
          </tbody>
        </table>
        <p style="margin-top: 16px; color: #6B7280; font-size: 0.9em;">
          Consultez le tableau de bord admin pour traiter cette candidature.
        </p>
      </div>
    `;

    await sendMail({ to: TRAINING_NOTIFICATION_EMAIL, subject, text, html });
  } catch (error) {
    logger.error("Échec de l'envoi de la notification interne (équipe formation)", {
      error: error instanceof Error ? error.message : error,
    });
  }
};