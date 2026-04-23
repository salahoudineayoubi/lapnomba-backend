import fs from "fs";
import path from "path";
import { uploadFromBase64 } from "../../../../utils/cloudinary";
import { sendMail } from "../../../../utils/sendMail";

/**
 * Gère l'upload des fichiers.
 * Photo -> Cloudinary
 * CV -> Stockage Local
 */
export const handleFileUploads = async (input: any) => {
  let photoUrl = input.photo;
  let cvUrl = input.cv;

  try {
    if (photoUrl && photoUrl.startsWith("data:")) {
      const res = await uploadFromBase64(photoUrl, {
        folder: "candidatures/photos",
        resource_type: "image",
      });
      photoUrl = res.secure_url;
    }

    if (cvUrl && cvUrl.startsWith("data:")) {
      const base64Data = cvUrl.split(";base64,").pop();
      const fileName = `cv-${Date.now()}-${Math.floor(Math.random() * 1000)}.pdf`;

      const uploadDir = path.join(process.cwd(), "public", "uploads", "cv");
      const filePath = path.join(uploadDir, fileName);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      fs.writeFileSync(filePath, base64Data!, { encoding: "base64" });

      cvUrl = `/uploads/cv/${fileName}`;
    }

    if (photoUrl && !photoUrl.startsWith("http")) {
      photoUrl = null;
    }

    if (cvUrl && !cvUrl.startsWith("/") && !cvUrl.startsWith("http")) {
      cvUrl = null;
    }

    return { photoUrl, cvUrl };
  } catch (error) {
    console.error("Erreur lors du traitement des fichiers :", error);
    return { photoUrl: null, cvUrl: null };
  }
};

const buildCandidateStatusMail = (
  type: "CONFIRMATION" | "APPROBATION" | "REFUS",
  nom: string
): { subject: string; text: string; html: string } => {
  const safeName = nom?.trim() || "Cher candidat";

  const messages = {
    CONFIRMATION: {
      subject: "Accusé de réception de votre candidature - Fondation Lap Nomba",
      text: `Bonjour ${safeName},

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
      text: `Bonjour ${safeName},

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
      text: `Bonjour ${safeName},

Après examen attentif de votre dossier, nous sommes au regret de vous informer que nous ne pouvons pas donner une suite favorable à votre candidature pour cette session.

Nous vous remercions pour l’intérêt accordé à nos programmes et vous encourageons à poursuivre vos efforts dans votre parcours.

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
          </p>
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
 * Gère l'envoi des emails transactionnels
 */
export const sendStatusEmail = async (
  email: string,
  nom: string,
  type: "CONFIRMATION" | "APPROBATION" | "REFUS"
) => {
  try {
    const { subject, text, html } = buildCandidateStatusMail(type, nom);

    await sendMail({
      to: email,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error(`Erreur lors de l'envoi de l'email (${type}) à ${email} :`, error);
  }
};