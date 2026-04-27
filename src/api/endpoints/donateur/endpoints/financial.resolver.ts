import { DonationModel } from "../../../../models/donor";
import logger from "../../../../utils/logger";
import {
  createSmobilpayOrderForDonation,
  verifyAndSyncDonationWithSmobilpay,
} from "../../../../services/smobilpay/smobilpay.service";

import {
  ensureValidFinancialDonationInput,
  ensureValidBankTransferInput,
  createFinancialDonationRecord,
  createBankTransferDonationRecord,
  ensureCampaignStatsUpdated,
  markDonationAsCompleted,
  markDonationAsFailed,
} from "./financia/helpers";

import { sendCompletionNotificationsSilently } from "./financia/notifications";
import { donationMessages } from "./financia/message";

export const financialDonationResolvers = {
  Query: {
  donations: async () => {
    const donations = await DonationModel.find().sort({ createdAt: -1 });

    return donations.map((d: any) => ({
      ...d.toObject(),

      // 🔥 FIX CRITIQUE
      createdAt: d.createdAt
        ? new Date(d.createdAt).getTime()
        : null,
    }));
  },

  donationById: async (_: any, { id }: any) => {
    const d = await DonationModel.findById(id);

    if (!d) return null;

    return {
      ...d.toObject(),

      // 🔥 FIX ICI AUSSI
      createdAt: d.createdAt
        ? new Date(d.createdAt).getTime()
        : null,
    };
  },

    donationStats: async () => {
      const stats = await DonationModel.aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            totalCompleted: {
              $sum: {
                $cond: [{ $eq: ["$status", "COMPLETED"] }, "$amount", 0],
              },
            },
            totalPending: {
              $sum: {
                $cond: [{ $eq: ["$status", "PENDING"] }, "$amount", 0],
              },
            },
            totalFailed: {
              $sum: {
                $cond: [{ $eq: ["$status", "FAILED"] }, "$amount", 0],
              },
            },
            count: { $sum: 1 },
          },
        },
      ]);

      return (
        stats[0] || {
          totalAmount: 0,
          totalCompleted: 0,
          totalPending: 0,
          totalFailed: 0,
          count: 0,
        }
      );
    },
  },


  Mutation: {
    createFinancialDonation: async (_: any, { input }: any) => {
      ensureValidFinancialDonationInput(input);

      const donation = await createFinancialDonationRecord(input);

      logger.info("Donation financière créée", {
        donationId: donation.id,
        paymentMethod: donation.paymentMethod,
        amount: donation.amount,
        currency: donation.currency,
      });

      return donation;
    },

    createBankTransferDonation: async (_: any, { input }: any) => {
      ensureValidBankTransferInput(input);

      const donation = await createBankTransferDonationRecord(input);

      logger.info("Donation virement créée", {
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
        throw new Error(donationMessages.donationNotFound);
      }

      if (donation.paymentMethod === "BANK_TRANSFER") {
        throw new Error(donationMessages.bankTransferShouldNotUseSmobilpay);
      }

      if (donation.paymentMethod === "CASH") {
        throw new Error(donationMessages.cashNotSupportedViaSmobilpay);
      }

      const result = await createSmobilpayOrderForDonation(donationId);
      const refreshedDonation = await DonationModel.findById(donationId);

      if (!refreshedDonation) {
        throw new Error(donationMessages.donationNotFoundAfterInit);
      }

      logger.info("Paiement donation initialisé", {
        donationId,
        provider: result.provider,
        reference: result.reference,
        transactionId: result.transactionId,
        paymentUrl: result.paymentUrl,
        status: refreshedDonation.status,
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
        throw new Error(donationMessages.donationNotFound);
      }

      const alreadyCompleted = before.status === "COMPLETED";
      const donation = await verifyAndSyncDonationWithSmobilpay(donationId);

      if (!alreadyCompleted && donation.status === "COMPLETED") {
        await ensureCampaignStatsUpdated(donation);
        sendCompletionNotificationsSilently(donation);

        logger.info("Donation confirmée après vérification", {
          donationId,
          status: donation.status,
          providerReference: donation.providerReference,
          providerTransactionId: donation.providerTransactionId,
          providerStatusRaw: donation.providerStatusRaw,
        });
      } else {
        logger.info("Vérification donation effectuée", {
          donationId,
          status: donation.status,
          providerReference: donation.providerReference,
          providerTransactionId: donation.providerTransactionId,
          providerStatusRaw: donation.providerStatusRaw,
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
        throw new Error(donationMessages.donationNotFound);
      }

      if (donation.paymentMethod !== "BANK_TRANSFER") {
        throw new Error(donationMessages.notABankTransfer);
      }

      if (donation.status === "COMPLETED") {
        throw new Error(donationMessages.bankTransferAlreadyValidated);
      }

      await markDonationAsCompleted(donation);
      await ensureCampaignStatsUpdated(donation);
      sendCompletionNotificationsSilently(donation);

      logger.info("Virement bancaire validé manuellement", {
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
        throw new Error(donationMessages.donationNotFound);
      }

      if (donation.paymentMethod !== "BANK_TRANSFER") {
        throw new Error(donationMessages.notABankTransfer);
      }

      await markDonationAsFailed(donation);

      logger.info("Virement bancaire marqué en échec", {
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

      if (donation.status === "COMPLETED" && donation.campaignId) {
        throw new Error(
          donationMessages.cannotDeleteConfirmedCampaignDonation
        );
      }

      const result = await DonationModel.deleteOne({ _id: id });

      logger.info("Donation supprimée", {
        donationId: id,
        deleted: result.deletedCount > 0,
      });

      return result.deletedCount > 0;
    },
  },
};