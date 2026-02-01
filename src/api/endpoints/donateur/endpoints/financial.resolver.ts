import { DonationModel } from "../../../../models/donor";
import { CrowdfundingCampaignModel } from "../../../../models/crowdfunding_campaign";
import { generateAndSendReceipt } from "../../../../utils/receipt"; // Assure-toi que le chemin est correct

export const financialDonationResolvers = {
  Query: {
    /**
     * ✅ Récupérer toutes les donations pour l'admin
     */
    donations: async () => {
      // Trie par date de création décroissante (plus récent d'abord)
      return await DonationModel.find().sort({ createdAt: -1 });
    },

    /**
     * ✅ Récupérer une donation spécifique par son ID
     */
    donationById: async (_: any, { id }: any) => {
      return await DonationModel.findById(id);
    },
  },

  Mutation: {
    /**
     * ✅ Création d'un don par VIREMENT bancaire (Côté Utilisateur)
     * Crée une donation avec le statut 'PENDING'
     */
    createBankTransferDonation: async (_: any, { input }: any) => {
      // Validations de sécurité
      if (!input?.donorName?.trim()) throw new Error("Nom du donateur requis.");
      if (!input?.donorEmail?.trim()) throw new Error("Email du donateur requis.");
      if (!input?.amount || input.amount <= 0) throw new Error("Montant invalide.");
      if (!input?.reference?.trim()) throw new Error("La référence/objet du virement est obligatoire.");

      const donation = await DonationModel.create({
        donorName: input.donorName.trim(),
        donorEmail: input.donorEmail.trim().toLowerCase(),
        donorPhone: input.donorPhone?.trim(),
        anonymous: input.anonymous ?? false,

        category: "FINANCIAL",
        amount: input.amount,
        currency: input.currency ?? "XAF",
        message: input.message,
        futureContact: input.futureContact ?? false,

        paymentMethod: "BANK_TRANSFER",
        status: "PENDING",

        // Informations spécifiques au virement
        bankTransfer: {
          reference: input.reference.trim(),
          senderBank: input.senderBank?.trim(),
          sentAt: input.sentAt ? new Date(input.sentAt) : undefined,
          proofUrl: input.proofUrl?.trim(),
        },
        
        // Liaison optionnelle à une campagne
        campaignId: input.campaignId || undefined,
      });

      return donation;
    },

    /**
     * ✅ Valider un virement (Côté Admin)
     * Change le statut en 'COMPLETED', met à jour les stats et envoie le reçu
     */
    markBankTransferAsCompleted: async (_: any, { donationId }: any) => {
      const donation = await DonationModel.findById(donationId);
      
      if (!donation) throw new Error("Donation introuvable.");
      if (donation.paymentMethod !== "BANK_TRANSFER") {
        throw new Error("Cette donation n'est pas un virement bancaire.");
      }
      if (donation.status === "COMPLETED") {
        throw new Error("Cette donation est déjà validée.");
      }

      // 1. Mise à jour du statut
      donation.status = "COMPLETED";
      await donation.save();

      // 2. Mise à jour des statistiques de la campagne si liée
      if (donation.campaignId) {
        await CrowdfundingCampaignModel.updateOne(
          { _id: donation.campaignId },
          { 
            $inc: { 
              totalRaised: donation.amount, 
              donorsCount: 1 
            } 
          }
        );
      }

      // 3. Génération du PDF et envoi de l'email (Processus asynchrone en arrière-plan)
      // On ne met pas de "await" pour ne pas faire attendre l'interface admin
      generateAndSendReceipt(donation).catch((err) => {
        console.error("🔴 Échec de la génération/envoi du reçu :", err);
      });

      return donation;
    },

    /**
     * ✅ Marquer un virement comme échoué/rejeté (Côté Admin)
     */
    markBankTransferAsFailed: async (_: any, { donationId }: any) => {
      const donation = await DonationModel.findById(donationId);
      
      if (!donation) throw new Error("Donation introuvable.");
      if (donation.paymentMethod !== "BANK_TRANSFER") {
        throw new Error("Cette donation n'est pas un virement bancaire.");
      }

      donation.status = "FAILED";
      await donation.save();
      
      return donation;
    },

    /**
     * ✅ Supprimer définitivement une donation (Côté Admin)
     */
    deleteDonation: async (_: any, { id }: any) => {
      const result = await DonationModel.deleteOne({ _id: id });
      return result.deletedCount > 0;
    },
  },
};