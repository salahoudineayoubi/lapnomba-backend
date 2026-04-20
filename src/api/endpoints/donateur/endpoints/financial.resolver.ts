import {
  DonationModel,
  providerFromPaymentMethod,
} from "../../../../models/donor";
import { CrowdfundingCampaignModel } from "../../../../models/crowdfunding_campaign";
import { generateAndSendReceipt } from "../../../../utils/receipt";
import logger from "../../../../utils/logger";
import {
  createSmobilpayOrderForDonation,
  verifyAndSyncDonationWithSmobilpay,
} from "../../../../services/smobilpay/smobilpay.service";

const isValidEmail = (email?: string): boolean => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const normalizeCurrency = (currency?: string): string => {
  return (currency || "XAF").toUpperCase().trim();
};

const normalizePhone = (phone?: string): string | undefined => {
  if (!phone) return undefined;

  const cleaned = phone.replace(/[^\d]/g, "");

  if (!cleaned) return undefined;

  if (cleaned.startsWith("237") && cleaned.length === 12) {
    return cleaned.slice(3);
  }

  return cleaned;
};

const ensureCampaignStatsUpdated = async (donation: any) => {
  if (!donation?.campaignId) return;

  await CrowdfundingCampaignModel.updateOne(
    { _id: donation.campaignId },
    {
      $inc: {
        totalRaised: donation.amount,
        donorsCount: 1,
      },
    }
  );
};

const sendReceiptSilently = (donation: any) => {
  generateAndSendReceipt(donation).catch((err) => {
    logger.error("🔴 Échec de la génération/envoi du reçu :", err);
  });
};

export const financialDonationResolvers = {
  Query: {
    donations: async () => {
      return await DonationModel.find().sort({ createdAt: -1 });
    },

    donationById: async (_: any, { id }: { id: string }) => {
      return await DonationModel.findById(id);
    },
  },

  Mutation: {
    createFinancialDonation: async (_: any, { input }: any) => {
      if (!input?.donorName?.trim()) {
        throw new Error("Nom du donateur requis.");
      }

      if (!isValidEmail(input?.donorEmail)) {
        throw new Error("Email du donateur invalide.");
      }

      if (!input?.amount || Number(input.amount) <= 0) {
        throw new Error("Montant invalide.");
      }

      if (!input?.paymentMethod) {
        throw new Error("Le moyen de paiement est requis.");
      }

      if (input.paymentMethod === "BANK_TRANSFER") {
        throw new Error(
          "Utilise createBankTransferDonation pour les virements bancaires."
        );
      }

      if (input.paymentMethod === "CASH") {
        throw new Error("Le mode CASH n'est pas pris en charge ici.");
      }

      const donation = await DonationModel.create({
        donorName: input.donorName.trim(),
        donorEmail: input.donorEmail.trim().toLowerCase(),
        donorPhone: normalizePhone(input.donorPhone),
        anonymous: input.anonymous ?? false,

        category: "FINANCIAL",
        amount: Number(input.amount),
        currency: normalizeCurrency(input.currency),
        message: input.message?.trim(),
        futureContact: input.futureContact ?? false,

        paymentMethod: input.paymentMethod,
        status: "PENDING",
        provider: providerFromPaymentMethod(input.paymentMethod),

        campaignId: input.campaignId || undefined,
      });

      logger.info("✅ Donation financière créée", {
        donationId: donation.id,
        paymentMethod: donation.paymentMethod,
        amount: donation.amount,
        currency: donation.currency,
      });

      return donation;
    },

    createBankTransferDonation: async (_: any, { input }: any) => {
      if (!input?.donorName?.trim()) {
        throw new Error("Nom du donateur requis.");
      }

      if (!isValidEmail(input?.donorEmail)) {
        throw new Error("Email du donateur requis.");
      }

      if (!input?.amount || Number(input.amount) <= 0) {
        throw new Error("Montant invalide.");
      }

      if (!input?.reference?.trim()) {
        throw new Error("La référence/objet du virement est obligatoire.");
      }

      const donation = await DonationModel.create({
        donorName: input.donorName.trim(),
        donorEmail: input.donorEmail.trim().toLowerCase(),
        donorPhone: normalizePhone(input.donorPhone),
        anonymous: input.anonymous ?? false,

        category: "FINANCIAL",
        amount: Number(input.amount),
        currency: normalizeCurrency(input.currency),
        message: input.message?.trim(),
        futureContact: input.futureContact ?? false,

        paymentMethod: "BANK_TRANSFER",
        status: "PENDING",

        bankTransfer: {
          reference: input.reference.trim(),
          senderBank: input.senderBank?.trim(),
          sentAt: input.sentAt ? new Date(input.sentAt) : undefined,
          proofUrl: input.proofUrl?.trim(),
        },

        campaignId: input.campaignId || undefined,
      });

      logger.info("✅ Donation virement créée", {
        donationId: donation.id,
        amount: donation.amount,
        currency: donation.currency,
      });

      return donation;
    },

    initiateDonationPayment: async (
      _: any,
      { donationId }: { donationId: string }
    ) => {
      const donation = await DonationModel.findById(donationId);

      if (!donation) {
        throw new Error("Donation introuvable.");
      }

      if (donation.paymentMethod === "BANK_TRANSFER") {
        throw new Error(
          "Cette donation est un virement bancaire et ne doit pas être initiée via Smobilpay."
        );
      }

      if (donation.paymentMethod === "CASH") {
        throw new Error("Le mode CASH n'est pas pris en charge via Smobilpay.");
      }

      const result = await createSmobilpayOrderForDonation(donationId);

      // On relit la donation pour renvoyer les valeurs effectivement sauvegardées
      const refreshedDonation = await DonationModel.findById(donationId);

      if (!refreshedDonation) {
        throw new Error("Donation introuvable après initialisation.");
      }

      logger.info("✅ Paiement donation initialisé", {
        donationId,
        provider: result.provider,
        reference: result.reference,
        transactionId: result.transactionId,
        paymentUrl: result.paymentUrl,
      });

      return {
        donationId: result.donationId,
        provider: result.provider,
        paymentUrl: result.paymentUrl,
        reference: result.reference,
        transactionId: result.transactionId,
        status: refreshedDonation.status,
        message: "Paiement initialisé avec succès.",
      };
    },

    verifyDonationPayment: async (
      _: any,
      { donationId }: { donationId: string }
    ) => {
      const before = await DonationModel.findById(donationId);

      if (!before) {
        throw new Error("Donation introuvable.");
      }

      const alreadyCompleted = before.status === "COMPLETED";

      const donation = await verifyAndSyncDonationWithSmobilpay(donationId);

      if (!alreadyCompleted && donation.status === "COMPLETED") {
        await ensureCampaignStatsUpdated(donation);
        sendReceiptSilently(donation);

        logger.info("✅ Donation confirmée après vérification", {
          donationId,
          status: donation.status,
        });
      } else {
        logger.info("ℹ️ Vérification donation effectuée", {
          donationId,
          status: donation.status,
        });
      }

      return donation;
    },

    markBankTransferAsCompleted: async (
      _: any,
      { donationId }: { donationId: string }
    ) => {
      const donation = await DonationModel.findById(donationId);

      if (!donation) {
        throw new Error("Donation introuvable.");
      }

      if (donation.paymentMethod !== "BANK_TRANSFER") {
        throw new Error("Cette donation n'est pas un virement bancaire.");
      }

      if (donation.status === "COMPLETED") {
        throw new Error("Cette donation est déjà validée.");
      }

      donation.status = "COMPLETED";
      donation.paidAt = new Date();
      donation.failedAt = undefined;
      await donation.save();

      await ensureCampaignStatsUpdated(donation);
      sendReceiptSilently(donation);

      logger.info("✅ Virement bancaire validé manuellement", {
        donationId,
        status: donation.status,
      });

      return donation;
    },

    markBankTransferAsFailed: async (
      _: any,
      { donationId }: { donationId: string }
    ) => {
      const donation = await DonationModel.findById(donationId);

      if (!donation) {
        throw new Error("Donation introuvable.");
      }

      if (donation.paymentMethod !== "BANK_TRANSFER") {
        throw new Error("Cette donation n'est pas un virement bancaire.");
      }

      donation.status = "FAILED";
      donation.failedAt = new Date();
      await donation.save();

      logger.info("⚠️ Virement bancaire marqué en échec", {
        donationId,
        status: donation.status,
      });

      return donation;
    },

    deleteDonation: async (_: any, { id }: { id: string }) => {
      const donation = await DonationModel.findById(id);

      if (!donation) {
        return false;
      }

      // Si déjà completed et campagne liée, on évite de supprimer sans réfléchir
      // Tu peux enlever ce garde-fou si tu veux autoriser la suppression brute
      if (donation.status === "COMPLETED" && donation.campaignId) {
        throw new Error(
          "Impossible de supprimer directement une donation confirmée liée à une campagne."
        );
      }

      const result = await DonationModel.deleteOne({ _id: id });

      logger.info("🗑️ Donation supprimée", {
        donationId: id,
        deleted: result.deletedCount > 0,
      });

      return result.deletedCount > 0;
    },
  },
};