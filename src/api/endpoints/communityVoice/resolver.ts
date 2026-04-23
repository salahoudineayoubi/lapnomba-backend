import { sendMail } from "../../../utils/sendMail";
import { CommunityVoiceModel } from "../../../models/communityvoice";

const buildCommunityVoiceMail = (
  type: "CONFIRMATION" | "APPROVAL" | "REJECTION",
  name: string
): { subject: string; text: string; html: string } => {
  const safeName = name?.trim() || "Cher contributeur";

  const messages = {
    CONFIRMATION: {
      subject: "Confirmation de réception de votre avis - Fondation Lap Nomba",
      text: `Bonjour ${safeName},

Nous vous remercions pour votre contribution à la Fondation Lap Nomba.

Votre avis a bien été reçu et est actuellement en attente de modération par notre équipe.

Nous vous informerons dès qu’il sera approuvé et publié.

Cordialement,
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Confirmation de réception de votre avis</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous vous remercions pour votre contribution à la
            <strong>Fondation Lap Nomba</strong>.
          </p>
          <p>
            Votre avis a bien été reçu et est actuellement en attente de modération
            par notre équipe.
          </p>
          <p>
            Nous vous informerons dès qu’il sera approuvé et publié.
          </p>
          <p>
            Cordialement,<br />
            <strong>Fondation Lap Nomba</strong>
          </p>
        </div>
      `,
    },

    APPROVAL: {
      subject: "Votre avis a été approuvé - Fondation Lap Nomba",
      text: `Bonjour ${safeName},

Bonne nouvelle.

Votre avis a été approuvé et publié sur notre plateforme.

Nous vous remercions pour votre contribution à la communauté Lap Nomba et pour votre confiance.

Cordialement,
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Votre avis a été approuvé</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Bonne nouvelle.
          </p>
          <p>
            Votre avis a été approuvé et publié sur notre plateforme.
          </p>
          <p>
            Nous vous remercions pour votre contribution à la communauté Lap Nomba
            et pour votre confiance.
          </p>
          <p>
            Cordialement,<br />
            <strong>Fondation Lap Nomba</strong>
          </p>
        </div>
      `,
    },

    REJECTION: {
      subject: "Mise à jour concernant votre avis - Fondation Lap Nomba",
      text: `Bonjour ${safeName},

Nous vous remercions pour votre contribution.

Après examen, votre avis n’a pas été retenu pour publication sur notre plateforme.

Nous vous remercions pour votre compréhension et pour l’intérêt que vous portez aux actions de la Fondation Lap Nomba.

Cordialement,
Fondation Lap Nomba`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Mise à jour concernant votre avis</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous vous remercions pour votre contribution.
          </p>
          <p>
            Après examen, votre avis n’a pas été retenu pour publication sur notre plateforme.
          </p>
          <p>
            Nous vous remercions pour votre compréhension et pour l’intérêt que vous
            portez aux actions de la Fondation Lap Nomba.
          </p>
          <p>
            Cordialement,<br />
            <strong>Fondation Lap Nomba</strong>
          </p>
        </div>
      `,
    },
  };

  return messages[type];
};

export const communityVoiceResolvers = {
  Query: {
    getApprovedVoices: async () => {
      return await CommunityVoiceModel.find({ isApproved: true }).sort({
        createdAt: -1,
      });
    },

    getAllVoicesForAdmin: async () => {
      return await CommunityVoiceModel.find().sort({ createdAt: -1 });
    },
  },

  Mutation: {
    submitCommunityVoice: async (
      _: any,
      { name, email, rating, comment }: any
    ) => {
      try {
        await CommunityVoiceModel.create({
          name,
          email,
          rating,
          comment,
          isApproved: false,
        });

        if (email) {
          try {
            const { subject, text, html } = buildCommunityVoiceMail(
              "CONFIRMATION",
              name
            );

            await sendMail({
              to: email,
              subject,
              text,
              html,
            });
          } catch (mailError) {
            console.error(
              "[CommunityVoice] Erreur envoi mail confirmation :",
              mailError
            );
          }
        }

        return {
          success: true,
          message: "Votre avis a été soumis et est en attente de modération.",
        };
      } catch (error) {
        console.error("[CommunityVoice] Erreur soumission :", error);
        return {
          success: false,
          message: "Erreur lors de la soumission.",
        };
      }
    },

    approveVoice: async (_: any, { id }: { id: string }) => {
      try {
        const voice = await CommunityVoiceModel.findByIdAndUpdate(
          id,
          { isApproved: true },
          { new: true }
        );

        if (!voice) {
          return {
            success: false,
            message: "Avis introuvable.",
          };
        }

        if (voice.email) {
          try {
            const { subject, text, html } = buildCommunityVoiceMail(
              "APPROVAL",
              voice.name
            );

            await sendMail({
              to: voice.email,
              subject,
              text,
              html,
            });
          } catch (mailError) {
            console.error(
              "[CommunityVoice] Erreur envoi mail approbation :",
              mailError
            );
          }
        }

        return {
          success: true,
          message: "Avis approuvé et publié !",
        };
      } catch (error) {
        console.error("[CommunityVoice] Erreur approbation :", error);
        return {
          success: false,
          message: "Erreur lors de l'approbation.",
        };
      }
    },

    deleteVoice: async (_: any, { id }: { id: string }) => {
      try {
        const voice = await CommunityVoiceModel.findById(id);

        if (!voice) {
          return {
            success: false,
            message: "Avis introuvable.",
          };
        }

        await CommunityVoiceModel.findByIdAndDelete(id);

        if (voice.email) {
          try {
            const { subject, text, html } = buildCommunityVoiceMail(
              "REJECTION",
              voice.name
            );

            await sendMail({
              to: voice.email,
              subject,
              text,
              html,
            });
          } catch (mailError) {
            console.error(
              "[CommunityVoice] Erreur envoi mail suppression :",
              mailError
            );
          }
        }

        return {
          success: true,
          message: "Avis supprimé.",
        };
      } catch (error) {
        console.error("[CommunityVoice] Erreur suppression :", error);
        return {
          success: false,
          message: "Erreur lors de la suppression.",
        };
      }
    },
  },
};