import { DonationModel } from "../../models/donor";
import { CrowdfundingCampaignModel } from "../../models/crowdfunding_campaign";
import { generateAndSendReceipt } from "../../utils/receipt";
import logger from "../../utils/logger";

type InternalPaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
  | "REFUNDED";

const mapSmobilpayStatus = (status?: string): InternalPaymentStatus => {
  const normalized = (status || "").toUpperCase().trim();

  switch (normalized) {
    case "SUCCESS":
    case "COMPLETED":
    case "PAID":
    case "APPROVED":
      return "COMPLETED";

    case "FAILED":
    case "ERROR":
    case "DECLINED":
      return "FAILED";

    case "CANCELLED":
    case "CANCELED":
      return "CANCELED";

    case "REFUNDED":
      return "REFUNDED";

    default:
      return "PENDING";
  }
};

const finalizeDonationIfCompleted = async (donation: any) => {
  if (!donation) return null;

  if (donation.status === "COMPLETED") {
    return donation;
  }

  donation.status = "COMPLETED";
  donation.paidAt = new Date();
  await donation.save();

  if (donation.campaignId) {
    await CrowdfundingCampaignModel.updateOne(
      { _id: donation.campaignId },
      { $inc: { totalRaised: donation.amount, donorsCount: 1 } }
    );
  }

  generateAndSendReceipt(donation).catch((err) => {
    logger.error("❌ Erreur envoi reçu Smobilpay :", err);
  });

  return donation;
};

export const handleSmobilpayWebhook = async (payload: any) => {
  logger.info("📩 Webhook Smobilpay reçu");

  const providerReference =
    payload?.reference ||
    payload?.providerReference ||
    payload?.merchantReference ||
    payload?.externalReference ||
    payload?.orderId ||
    payload?.transactionRef ||
    null;

  const transactionId =
    payload?.transactionId ||
    payload?.providerTransactionId ||
    payload?.transactionRef ||
    payload?.trxId ||
    null;

  const rawStatus =
    payload?.status ||
    payload?.transactionStatus ||
    payload?.paymentStatus ||
    "PENDING";

  const mappedStatus = mapSmobilpayStatus(rawStatus);

  let donation = null;

  if (providerReference) {
    donation = await DonationModel.findOne({ providerReference });
  }

  if (!donation && transactionId) {
    donation = await DonationModel.findOne({ providerTransactionId: transactionId });
  }

  if (!donation) {
    logger.warn("⚠️ Aucun don trouvé pour ce webhook Smobilpay");
    return {
      matched: false,
      providerReference,
      transactionId,
      status: mappedStatus,
    };
  }

  donation.providerStatusRaw = rawStatus;
  donation.webhookPayload = payload;

  if (providerReference) {
    donation.providerReference = providerReference;
  }

  if (transactionId) {
    donation.providerTransactionId = transactionId;
  }

  if (mappedStatus === "COMPLETED") {
    donation = await finalizeDonationIfCompleted(donation);
  } else if (mappedStatus === "FAILED") {
    donation.status = "FAILED";
    donation.failedAt = new Date();
    await donation.save();
  } else if (mappedStatus === "CANCELED") {
    donation.status = "CANCELED";
    await donation.save();
  } else if (mappedStatus === "REFUNDED") {
    donation.status = "REFUNDED";
    await donation.save();
  } else {
    donation.status = "PENDING";
    await donation.save();
  }

  return {
    matched: true,
    donationId: donation.id,
    providerReference: donation.providerReference,
    transactionId: donation.providerTransactionId,
    status: donation.status,
  };
};

/**
 * Vérification manuelle basique
 * Ici on prépare déjà la structure. Plus tard tu la brancheras
 * à l'API réelle Smobilpay pour demander le statut live.
 */
export const verifyDonationPaymentById = async (donationId: string) => {
  const donation = await DonationModel.findById(donationId);

  if (!donation) {
    throw new Error("Don introuvable.");
  }

  if (donation.status === "COMPLETED") {
    return donation;
  }

  /**
   * PLUS TARD :
   * ici tu appelleras la vraie API Smobilpay avec :
   * - donation.providerReference
   * - donation.providerTransactionId
   * puis tu mapperas le statut réel
   */

  const mappedStatus = mapSmobilpayStatus(donation.providerStatusRaw || "PENDING");

  if (mappedStatus === "COMPLETED") {
    return await finalizeDonationIfCompleted(donation);
  }

  if (mappedStatus === "FAILED") {
    donation.status = "FAILED";
    donation.failedAt = new Date();
    await donation.save();
  }

  return donation;
};