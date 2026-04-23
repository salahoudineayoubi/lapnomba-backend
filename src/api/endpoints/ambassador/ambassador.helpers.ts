import { sendMail } from "../../../utils/sendMail";

type AmbassadorMailType = "CONFIRMATION" | "APPROBATION" | "REFUS";

const buildAmbassadorEmailContent = (
  nom: string,
  type: AmbassadorMailType
): { subject: string; text: string; html: string } => {
  const safeName = nom?.trim() || "Cher candidat";

  const contents = {
    CONFIRMATION: {
      subject: "Confirmation de réception de votre candidature - Fondation Lap Nomba",
      text: `Bonjour ${safeName},

Nous vous remercions sincèrement pour l’intérêt que vous portez à la Fondation Lap Nomba.

Votre candidature au programme Ambassadeur Digital a bien été reçue et enregistrée par notre équipe.

Nous allons examiner attentivement votre profil, vos plateformes ainsi que votre engagement potentiel dans la promotion de nos actions.

Vous serez recontacté très prochainement pour la suite du processus.

Cordialement,
Le Responsable de la Communication
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2 style="margin-bottom: 16px;">Confirmation de réception de votre candidature</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous vous remercions sincèrement pour l’intérêt que vous portez à la
            <strong>Fondation Lap Nomba</strong>.
          </p>
          <p>
            Votre candidature au programme <strong>Ambassadeur Digital</strong> a bien été
            reçue et enregistrée par notre équipe.
          </p>
          <p>
            Nous allons examiner attentivement votre profil, vos plateformes ainsi que
            votre engagement potentiel dans la promotion de nos actions.
          </p>
          <p>
            Vous serez recontacté très prochainement pour la suite du processus.
          </p>
          <p>
            Cordialement,<br />
            <strong>Le Responsable de la Communication</strong><br />
            Fondation Lap Nomba
          </p>
        </div>
      `,
    },

    APPROBATION: {
      subject: "Validation de votre candidature - Fondation Lap Nomba",
      text: `Bonjour ${safeName},

Nous avons le plaisir de vous informer que votre candidature au programme Ambassadeur Digital de la Fondation Lap Nomba a été approuvée.

Nous vous remercions pour votre engagement et votre disponibilité à porter notre vision, nos valeurs et nos actions auprès du public.

Notre équipe prendra contact avec vous très prochainement, notamment via WhatsApp, afin de vous transmettre les informations utiles, votre kit de démarrage ainsi que les prochaines étapes de collaboration.

Bienvenue dans la communauté des Ambassadeurs de la Fondation Lap Nomba.

Cordialement,
Le Responsable de la Communication
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2 style="margin-bottom: 16px;">Validation de votre candidature</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous avons le plaisir de vous informer que votre candidature au programme
            <strong>Ambassadeur Digital</strong> de la <strong>Fondation Lap Nomba</strong>
            a été approuvée.
          </p>
          <p>
            Nous vous remercions pour votre engagement et votre disponibilité à porter
            notre vision, nos valeurs et nos actions auprès du public.
          </p>
          <p>
            Notre équipe prendra contact avec vous très prochainement, notamment via
            WhatsApp, afin de vous transmettre les informations utiles, votre kit de
            démarrage ainsi que les prochaines étapes de collaboration.
          </p>
          <p>
            <strong>Bienvenue dans la communauté des Ambassadeurs de la Fondation Lap Nomba.</strong>
          </p>
          <p>
            Cordialement,<br />
            <strong>Le Responsable de la Communication</strong><br />
            Fondation Lap Nomba
          </p>
        </div>
      `,
    },

    REFUS: {
      subject: "Suivi de votre candidature - Fondation Lap Nomba",
      text: `Bonjour ${safeName},

Nous vous remercions sincèrement pour votre intérêt envers la Fondation Lap Nomba et pour le temps consacré à votre candidature.

Après examen de votre dossier, nous sommes au regret de vous informer que votre candidature n’a pas été retenue pour cette phase du programme Ambassadeur Digital.

Cette décision ne remet nullement en cause la qualité de votre engagement. Nous vous encourageons à continuer à promouvoir des initiatives positives et à rester proche de nos actions.

Nous vous remercions pour votre compréhension.

Cordialement,
Le Responsable de la Communication
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2 style="margin-bottom: 16px;">Suivi de votre candidature</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous vous remercions sincèrement pour votre intérêt envers la
            <strong>Fondation Lap Nomba</strong> et pour le temps consacré à votre candidature.
          </p>
          <p>
            Après examen de votre dossier, nous sommes au regret de vous informer que
            votre candidature n’a pas été retenue pour cette phase du programme
            <strong>Ambassadeur Digital</strong>.
          </p>
          <p>
            Cette décision ne remet nullement en cause la qualité de votre engagement.
            Nous vous encourageons à continuer à promouvoir des initiatives positives
            et à rester proche de nos actions.
          </p>
          <p>Nous vous remercions pour votre compréhension.</p>
          <p>
            Cordialement,<br />
            <strong>Le Responsable de la Communication</strong><br />
            Fondation Lap Nomba
          </p>
        </div>
      `,
    },
  };

  return contents[type];
};

export const sendAmbassadorEmail = async (
  email: string,
  nom: string,
  type: AmbassadorMailType
) => {
  try {
    const { subject, text, html } = buildAmbassadorEmailContent(nom, type);

    await sendMail({
      to: email,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error(`Erreur email Ambassadeur (${type}) :`, error);
  }
};