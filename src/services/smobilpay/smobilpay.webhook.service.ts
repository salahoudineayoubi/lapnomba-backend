import { DonationModel } from "../../models/donor";
import { CrowdfundingCampaignModel } from "../../models/crowdfunding_campaign";
import AcademyPayment from "../../models/acdemy/payment";
import AcademyEnrollment from "../../models/acdemy/enrollment";

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
    case "SUCCESSFUL":
    case "CONFIRMED":
    case "COMPLETED":
    case "COMPLETE":
    case "PAID":
    case "APPROVED":
      return "COMPLETED";

    case "FAILED":
    case "FAIL":
    case "ERROR":
    case "DECLINED":
    case "REJECTED":
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

const getEnrollmentPaymentStatus = (payment: any) => {
  if (payment.paymentType === "full") return "paye";
  return "partiel";
};

const finalizeAcademyPaymentIfCompleted = async (payment: any) => {
  if (!payment) return null;

  if (payment.status === "completed") {
    return payment;
  }

  payment.status = "completed";
  payment.paidAt = new Date();
  await payment.save();

  await AcademyEnrollment.findByIdAndUpdate(payment.enrollmentId, {
    paymentStatus: getEnrollmentPaymentStatus(payment),
  });

  return payment;
};

const syncDonationFromWebhook = async ({
  donation,
  providerReference,
  transactionId,
  rawStatus,
  mappedStatus,
  payload,
}: any) => {
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
    type: "donation",
    donationId: donation.id,
    providerReference: donation.providerReference,
    transactionId: donation.providerTransactionId,
    status: donation.status,
  };
};

const syncAcademyPaymentFromWebhook = async ({
  payment,
  providerReference,
  transactionId,
  rawStatus,
  mappedStatus,
  payload,
}: any) => {
  payment.note = rawStatus;

  if (providerReference) {
    payment.providerReference = providerReference;
  }

  if (transactionId) {
    payment.providerTransactionId = transactionId;
  }

  if (mappedStatus === "COMPLETED") {
    payment = await finalizeAcademyPaymentIfCompleted(payment);
  } else if (mappedStatus === "FAILED") {
    payment.status = "failed";
    await payment.save();
  } else if (mappedStatus === "CANCELED") {
    payment.status = "canceled";
    await payment.save();
  } else if (mappedStatus === "REFUNDED") {
    payment.status = "refunded";
    await payment.save();
  } else {
    payment.status = "pending";
    await payment.save();
  }

  logger.info("✅ Paiement Academy synchronisé depuis webhook", {
    academyPaymentId: payment.id,
    enrollmentId: payment.enrollmentId,
    status: payment.status,
    rawStatus,
  });

  return {
    matched: true,
    type: "academy_payment",
    academyPaymentId: payment.id,
    enrollmentId: String(payment.enrollmentId),
    providerReference: payment.providerReference,
    transactionId: payment.providerTransactionId,
    status: payment.status,
  };
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
    payload?.txid ||
    null;

  const rawStatus =
    payload?.status ||
    payload?.transactionStatus ||
    payload?.paymentStatus ||
    payload?.state ||
    "PENDING";

  const mappedStatus = mapSmobilpayStatus(rawStatus);

  let donation = null;

  if (providerReference) {
    donation = await DonationModel.findOne({ providerReference });
  }

  if (!donation && transactionId) {
    donation = await DonationModel.findOne({
      providerTransactionId: transactionId,
    });
  }

  if (donation) {
    return await syncDonationFromWebhook({
      donation,
      providerReference,
      transactionId,
      rawStatus,
      mappedStatus,
      payload,
    });
  }

  let academyPayment = null;

  if (providerReference) {
    academyPayment = await AcademyPayment.findOne({ providerReference });
  }

  if (!academyPayment && transactionId) {
    academyPayment = await AcademyPayment.findOne({
      providerTransactionId: transactionId,
    });
  }

  if (academyPayment) {
    return await syncAcademyPaymentFromWebhook({
      payment: academyPayment,
      providerReference,
      transactionId,
      rawStatus,
      mappedStatus,
      payload,
    });
  }

  logger.warn("⚠️ Aucun don ni paiement Academy trouvé pour ce webhook Smobilpay", {
    providerReference,
    transactionId,
    rawStatus,
  });

  return {
    matched: false,
    providerReference,
    transactionId,
    status: mappedStatus,
  };
};

export const verifyDonationPaymentById = async (donationId: string) => {
  const donation = await DonationModel.findById(donationId);

  if (!donation) {
    throw new Error("Don introuvable.");
  }

  if (donation.status === "COMPLETED") {
    return donation;
  }

  const mappedStatus = mapSmobilpayStatus(
    donation.providerStatusRaw || "PENDING"
  );

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