import crypto from "crypto";
import smobilpayConfig from "../../config/smobilpay";
import logger from "../../utils/logger";
import { smobilpayPost, smobilpayGet } from "../smobilpay/smobilpay.client";

import AcademyPayment from "../../models/acdemy/payment";
import AcademyEnrollment from "../../models/acdemy/enrollment";

type AcademyPaymentMethod =
  | "momo"
  | "orange_money"
  | "card"
  | "bank_transfer"
  | "cash"
  | "international";

type AcademyPaymentType = "monthly" | "full" | "registration_fee";

interface InitiateAcademyPaymentInput {
  enrollmentId: string;
  method: AcademyPaymentMethod;
  paymentType: AcademyPaymentType;
  phone?: string;
  month?: string;
}

const generateMerchantReference = (prefix = "LNA-ACA"): string => {
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${Date.now()}-${rand}`;
};

const cleanPhoneNumber = (phone?: string): string | undefined => {
  if (!phone) return undefined;

  const cleaned = phone.replace(/[^\d]/g, "");

  if (!cleaned) return undefined;

  if (cleaned.startsWith("237") && cleaned.length === 12) {
    return cleaned.slice(3);
  }

  return cleaned;
};

const getWalletConfig = (method: AcademyPaymentMethod) => {
  switch (method) {
    case "orange_money":
      return {
        merchantCode: smobilpayConfig.orangeMoneyMerchantCode,
        serviceId: smobilpayConfig.orangeMoneyServiceId,
        provider: "OM",
      };

    case "momo":
      return {
        merchantCode: smobilpayConfig.mtnMomoMerchantCode,
        serviceId: smobilpayConfig.mtnMomoServiceId,
        provider: "MOMO",
      };

    case "card":
      return {
        merchantCode:
          process.env.SMOBILPAY_CARD_MERCHANT_CODE ||
          smobilpayConfig.orangeMoneyMerchantCode,
        serviceId: Number(process.env.SMOBILPAY_CARD_SERVICE_ID || 0),
        provider: "CARD",
      };

    default:
      throw new Error(
        `Méthode de paiement non supportée par Smobilpay: ${method}`
      );
  }
};

const getPaymentAmount = (
  enrollment: any,
  paymentType: AcademyPaymentType
): number => {
  if (paymentType === "monthly") {
    return enrollment.monthlyPrice || 30000;
  }

  if (paymentType === "full") {
    return enrollment.totalAmount;
  }

  if (paymentType === "registration_fee") {
    return enrollment.monthlyPrice || 30000;
  }

  return enrollment.monthlyPrice || 30000;
};

const buildReturnUrl = (paymentId: string): string => {
  const separator =
    smobilpayConfig.academyPaymentReturnUrl.includes("?")
      ? "&"
      : "?";

  return `${smobilpayConfig.academyPaymentReturnUrl}${separator}academyPaymentId=${encodeURIComponent(
    paymentId
  )}`;
};

const buildNotificationUrl = (): string => {
  return smobilpayConfig.callbackUrl;
};

const extractTransactionId = (data: any): string | null => {
  return (
    data?.txid ||
    data?.transactionId ||
    data?.orderTransactionId ||
    data?.id ||
    data?.orderId ||
    data?.data?.txid ||
    null
  );
};

const extractPaymentUrl = (data: any): string | null => {
  return (
    data?.paymentUrl ||
    data?.redirectUrl ||
    data?.checkoutUrl ||
    data?.data?.paymentUrl ||
    null
  );
};

const extractRawStatus = (data: any): string => {
  return (
    data?.status ||
    data?.paymentStatus ||
    data?.transactionStatus ||
    data?.state ||
    data?.data?.status ||
    "PENDING"
  );
};

export const initiateAcademyPayment = async (
  input: InitiateAcademyPaymentInput
) => {
  const enrollment = await AcademyEnrollment.findById(input.enrollmentId);

  if (!enrollment) {
    throw new Error("Inscription Academy introuvable.");
  }

  if (
    input.method === "bank_transfer" ||
    input.method === "cash" ||
    input.method === "international"
  ) {
    throw new Error(
      "Cette méthode ne doit pas être initialisée via Smobilpay."
    );
  }

  const amount = getPaymentAmount(enrollment, input.paymentType);
  const merchantReference = generateMerchantReference();
  const walletConfig = getWalletConfig(input.method);

  const academyPayment = new AcademyPayment({
    enrollmentId: enrollment._id,
    applicationId: enrollment.applicationId,

    amount,
    currency: enrollment.currency || "XAF",

    paymentType: input.paymentType || "monthly",
    month: input.month,

    method: input.method,
    status: "pending",

    provider: "MAVIANCE",
    providerReference: merchantReference,
  });

  await academyPayment.save();

  const now = new Date();
  const expiryDate = new Date(now.getTime() + 30 * 60 * 1000);

  const payload = {
    currency: enrollment.currency || smobilpayConfig.defaultCurrency,
    customerName: enrollment.studentName,
    description: `Paiement formation ${enrollment.selectedTrack} - Lap Nomba Academy`,
    email: enrollment.email,
    expiryDate: expiryDate.toISOString(),
    id: {
      uuid: crypto.randomUUID(),
    },
    items: [
      {
        itemId: String(academyPayment._id),
        particulars: `Lap Nomba Academy - ${enrollment.selectedTrack}`,
        quantity: 1,
        subTotal: amount,
        unitCost: amount,
      },
    ],
    langKey: smobilpayConfig.defaultLangKey,
    merchantReference,
    merchantCode: walletConfig.merchantCode,
    serviceId: walletConfig.serviceId,
    orderDate: now.toISOString(),
    phoneNumber: cleanPhoneNumber(input.phone || enrollment.phone),
    totalAmount: amount,
    returnUrl: buildReturnUrl(String(academyPayment._id)),
    notificationUrl: buildNotificationUrl(),
    optRefOne: String(enrollment._id),
    optRefTwo: "ACADEMY",
  };

  logger.info("📤 Création paiement Academy Smobilpay", {
    enrollmentId: String(enrollment._id),
    academyPaymentId: String(academyPayment._id),
    merchantReference,
    amount,
    method: input.method,
  });

  const response = await smobilpayPost<any>(smobilpayConfig.orderUrl, payload);

  if (!response?.data) {
    throw new Error("Réponse vide reçue depuis Smobilpay.");
  }

  const transactionId = extractTransactionId(response.data);
  const paymentUrl = extractPaymentUrl(response.data);
  const rawStatus = extractRawStatus(response.data);

  academyPayment.providerTransactionId = transactionId || undefined;
  academyPayment.providerPaymentUrl = paymentUrl || undefined;
  academyPayment.note = rawStatus;
  await academyPayment.save();

  logger.info("✅ Paiement Academy Smobilpay initialisé", {
    academyPaymentId: String(academyPayment._id),
    transactionId,
    paymentUrl,
    rawStatus,
  });

  return academyPayment;
};

export const verifyAcademyPaymentByTxid = async (txid: string) => {
  if (!txid?.trim()) {
    throw new Error("txid requis.");
  }

  const response = await smobilpayGet<any>(smobilpayConfig.orderStatusUrl, {
    txid,
  });

  logger.info("📥 Statut Academy Smobilpay par txid", response.data);

  return response.data;
};

export const verifyAcademyPaymentByMerchantReference = async (
  merchantReference: string
) => {
  if (!merchantReference?.trim()) {
    throw new Error("merchantReference requis.");
  }

  const response = await smobilpayGet<any>(smobilpayConfig.orderStatusUrl, {
    orderMerchantId: merchantReference,
  });

  logger.info("📥 Statut Academy Smobilpay par merchantReference", response.data);

  return response.data;
};