import { DonationModel } from "../../../../models/donor";
import logger from "../../../../utils/logger";
import { createSmobilpayOrderForDonation } from "../../../../services/smobilpay/smobilpay.service";

import {
  ensureValidFinancialDonationInput,
  ensureValidBankTransferInput,
  createFinancialDonationRecord,
  createBankTransferDonationRecord,
  markDonationAsFailed,
} from "./financia/helpers";

import { completeDonationOnce, confirmDonationPayment } from "./financia/completion";
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
      const exists = await DonationModel.exists({ _id: donationId });

      if (!exists) {
        throw new Error(donationMessages.donationNotFound);
      }

      return await confirmDonationPayment(donationId);
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

      const { donation: completed, justCompleted } = await completeDonationOnce(donationId);

      if (!justCompleted) {
        throw new Error(donationMessages.bankTransferAlreadyValidated);
      }

      logger.info("Virement bancaire validé manuellement", { donationId });

      return completed;
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