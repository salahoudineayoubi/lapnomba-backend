import Ambassador from "../../../models/ambassador";
import { sendAmbassadorEmail } from "./ambassador.helpers";

export const ambassadorResolvers = {
  Query: {
    // Récupère tous les ambassadeurs triés par date décroissante
    ambassadors: async () => {
      try {
        return await Ambassador.find().sort({ createdAt: -1 });
      } catch (error) {
        throw new Error("Erreur lors de la récupération des ambassadeurs.");
      }
    },
    // Récupère un ambassadeur spécifique par son ID
    ambassadorById: async (_: any, { id }: { id: string }) => {
      try {
        const res = await Ambassador.findById(id);
        if (!res) throw new Error("Ambassadeur non trouvé.");
        return res;
      } catch (error) {
        throw new Error("ID invalide ou ambassadeur inexistant.");
      }
    },
  },

  Mutation: {
    // Création d'une candidature
    createAmbassador: async (_: any, { input }: any) => {
      try {
        const newAmbassador = new Ambassador({
          ...input,
          statut: "en attente" // On force le statut initial par sécurité
        });
        const saved = await newAmbassador.save();
        
        // EMAIL DE CONFIRMATION (On ne bloque pas le retour si l'email échoue)
        sendAmbassadorEmail(saved.email, saved.nomComplet, 'CONFIRMATION').catch(err => 
          console.error("Erreur envoi email confirmation:", err)
        );
        
        return saved;
      } catch (error: any) {
        if (error.code === 11000) throw new Error("Cet email est déjà enregistré dans nos candidatures.");
        throw new Error("Impossible de soumettre la candidature.");
      }
    },

    // Mise à jour du statut (Approuvé / Refusé)
    updateAmbassadorStatus: async (_: any, { id, statut }: { id: string; statut: string }) => {
      try {
        const updated = await Ambassador.findByIdAndUpdate(
          id, 
          { statut }, 
          { new: true } // Renvoie l'objet MODIFIÉ pour le frontend
        );

        if (!updated) throw new Error("Ambassadeur introuvable.");

        // DÉCLENCHEMENT DES EMAILS SELON LE STATUT
        // On utilise des if/else clairs basés sur les valeurs attendues
        if (statut.toLowerCase() === "approuvé" || statut.toLowerCase() === "approuvée") {
          sendAmbassadorEmail(updated.email, updated.nomComplet, 'APPROBATION').catch(e => console.error(e));
        } else if (statut.toLowerCase() === "refusé" || statut.toLowerCase() === "refusée") {
          sendAmbassadorEmail(updated.email, updated.nomComplet, 'REFUS').catch(e => console.error(e));
        }

        return updated;
      } catch (error) {
        throw new Error("Erreur lors de la mise à jour du statut.");
      }
    },
    
    // Suppression définitive
    deleteAmbassador: async (_: any, { id }: { id: string }) => {
      try {
        const res = await Ambassador.findByIdAndDelete(id);
        return !!res;
      } catch (error) {
        throw new Error("Erreur lors de la suppression.");
      }
    }
  }
};