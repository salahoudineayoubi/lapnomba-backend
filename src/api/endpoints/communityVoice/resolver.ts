import { CommunityVoiceModel } from '../../../models/communityvoice';

export const communityVoiceResolvers = {
  Query: {
    // Liste publique
    getApprovedVoices: async () => {
      return await CommunityVoiceModel.find({ isApproved: true }).sort({ createdAt: -1 });
    },
    // Liste pour l'admin
    getAllVoicesForAdmin: async () => {
      // Ici, vous devriez normalement vérifier si l'utilisateur est admin via le context
      return await CommunityVoiceModel.find().sort({ createdAt: -1 });
    }
  },

  Mutation: {
    // Soumission par le visiteur
    submitCommunityVoice: async (_: any, { name, email, rating, comment }: any) => {
      try {
        await CommunityVoiceModel.create({
          name,
          email,
          rating,
          comment,
          isApproved: false // Toujours false à la création
        });
        return {
          success: true,
          message: "Votre avis a été soumis et est en attente de modération."
        };
      } catch (error) {
        return { success: false, message: "Erreur lors de la soumission." };
      }
    },

    // Approbation par l'admin
    approveVoice: async (_: any, { id }: { id: string }) => {
      try {
        const voice = await CommunityVoiceModel.findByIdAndUpdate(
          id, 
          { isApproved: true }, 
          { new: true }
        );
        if (!voice) return { success: false, message: "Avis introuvable." };
        return { success: true, message: "Avis approuvé et publié !" };
      } catch (error) {
        return { success: false, message: "Erreur lors de l'approbation." };
      }
    },

    // Suppression (rejet) par l'admin
    deleteVoice: async (_: any, { id }: { id: string }) => {
      try {
        await CommunityVoiceModel.findByIdAndDelete(id);
        return { success: true, message: "Avis supprimé." };
      } catch (error) {
        return { success: false, message: "Erreur lors de la suppression." };
      }
    }
  }
};