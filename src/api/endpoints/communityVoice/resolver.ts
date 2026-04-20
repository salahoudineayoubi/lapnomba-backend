import { sendMail } from "../../../utils/sendMail";
import { CommunityVoiceModel } from "../../../models/communityvoice";

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
            await sendMail(
              email,
              "Confirmation de réception de votre avis - Fondation Lap Nomba",
              `Bonjour ${name},

Nous vous remercions pour votre contribution à la Fondation Lap Nomba.

Votre avis a bien été reçu et est actuellement en attente de modération par notre équipe.

Nous vous informerons dès qu'il sera approuvé et publié.

Cordialement,
Fondation Lap Nomba`
            );
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
            await sendMail(
              voice.email,
              "Votre avis a été approuvé - Fondation Lap Nomba",
              `Bonjour ${voice.name},

Bonne nouvelle !

Votre avis a été approuvé et publié sur notre plateforme.

Merci pour votre contribution à la communauté Lap Nomba.

Cordialement,
Fondation Lap Nomba`
            );
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
            await sendMail(
              voice.email,
              "Mise à jour de votre avis - Fondation Lap Nomba",
              `Bonjour ${voice.name},

Nous vous remercions pour votre contribution.

Après vérification, votre avis n'a pas été retenu pour publication.

Merci pour votre compréhension.

Cordialement,
Fondation Lap Nomba`
            );
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