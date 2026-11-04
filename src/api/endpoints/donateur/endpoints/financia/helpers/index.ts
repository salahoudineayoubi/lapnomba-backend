import {
  DonationModel,
  providerFromPaymentMethod,
} from "../../../../../../models/donor";
import { CrowdfundingCampaignModel } from "../../../../../../models/crowdfunding_campaign";
import { donationMessages } from "../message";

export const isValidEmail = (email?: string): boolean => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const normalizeCurrency = (currency?: string): string => {
  return (currency || "XAF").toUpperCase().trim();
};

export const normalizePhone = (phone?: string): string | undefined => {
  if (!phone) return undefined;

  const cleaned = phone.replace(/[^\d]/g, "");
  if (!cleaned) return undefined;

  if (cleaned.startsWith("237") && cleaned.length === 12) {
    return cleaned.slice(3);
  }

  return cleaned;
};

// Limites des dons en ligne. Smobilpay (MTN MoMo / Orange Money / carte)
// ne traite que le franc CFA : toute autre devise est refusée côté serveur.
export const DONATION_LIMITS = {
  currencies: ["XAF"],
  minAmount: 500,
  maxAmount: 10_000_000,
} as const;

const MOBILE_MONEY_METHODS = ["MOMO", "ORANGE_MONEY"];

/** Vérifie devise + montant (entier, entre min et max). Lève une erreur sinon. */
export const ensureValidDonationAmount = (amount: any, currency?: string) => {
  const normalizedCurrency = normalizeCurrency(currency);
  if (!(DONATION_LIMITS.currencies as readonly string[]).includes(normalizedCurrency)) {
    throw new Error(`Devise non prise en charge : ${normalizedCurrency}. Les dons se font en XAF.`);
  }

  const value = Number(amount);
  if (!Number.isInteger(value) || value < DONATION_LIMITS.minAmount || value > DONATION_LIMITS.maxAmount) {
    throw new Error(
      `Le montant doit être un nombre entier entre ${DONATION_LIMITS.minAmount} et ${DONATION_LIMITS.maxAmount} XAF.`
    );
  }
};

/** MoMo / Orange Money : numéro mobile camerounais obligatoire (6XXXXXXXX). */
export const ensureValidMobileMoneyPhone = (paymentMethod?: string, phone?: string) => {
  if (!paymentMethod || !MOBILE_MONEY_METHODS.includes(paymentMethod)) return;
  const normalized = normalizePhone(phone);
  if (!normalized || !/^6\d{8}$/.test(normalized)) {
    throw new Error("Numéro mobile camerounais invalide (format attendu : 6XXXXXXXX).");
  }
};

export const ensureValidFinancialDonationInput = (input: any) => {
  if (!input?.donorName?.trim()) {
    throw new Error(donationMessages.donorNameRequired);
  }

  if (!isValidEmail(input?.donorEmail)) {
    throw new Error(donationMessages.donorEmailInvalid);
  }

  if (!input?.amount || Number(input.amount) <= 0) {
    throw new Error(donationMessages.amountInvalid);
  }

  if (!input?.paymentMethod) {
    throw new Error(donationMessages.paymentMethodRequired);
  }

  if (input.paymentMethod === "BANK_TRANSFER") {
    throw new Error(donationMessages.bankTransferUseDedicatedMutation);
  }

  if (input.paymentMethod === "CASH") {
    throw new Error(donationMessages.cashNotSupportedHere);
  }

  ensureValidDonationAmount(input.amount, input.currency);
  ensureValidMobileMoneyPhone(input.paymentMethod, input.donorPhone);
};

export const ensureValidBankTransferInput = (input: any) => {
  if (!input?.donorName?.trim()) {
    throw new Error(donationMessages.donorNameRequired);
  }

  if (!isValidEmail(input?.donorEmail)) {
    throw new Error(donationMessages.donorEmailRequired);
  }

  if (!input?.amount || Number(input.amount) <= 0) {
    throw new Error(donationMessages.amountInvalid);
  }

  if (!input?.reference?.trim()) {
    throw new Error(donationMessages.bankTransferReferenceRequired);
  }

  ensureValidDonationAmount(input.amount, input.currency);
};

export const createFinancialDonationRecord = async (input: any) => {
  return DonationModel.create({
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
};

export const createBankTransferDonationRecord = async (input: any) => {
  return DonationModel.create({
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
};

export const ensureCampaignStatsUpdated = async (donation: any) => {
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

export const markDonationAsCompleted = async (donation: any) => {
  donation.status = "COMPLETED";
  donation.paidAt = new Date();
  donation.failedAt = undefined;
  await donation.save();
  return donation;
};

export const markDonationAsFailed = async (donation: any) => {
  donation.status = "FAILED";
  donation.failedAt = new Date();
  await donation.save();
  return donation;
};