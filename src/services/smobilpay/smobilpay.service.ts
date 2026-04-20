import crypto from "crypto";
import smobilpayConfig from "../../config/smobilpay";
import { DonationModel, IDonation } from "../../models/donor";
import logger from "../../utils/logger";
import { smobilpayGet, smobilpayPost } from "./smobilpay.client";

export interface SmobilpayOrderItem {
  itemId: string;
  particulars: string;
  quantity: number;
  subTotal: number;
  unitCost: number;
}

export interface SmobilpayOrderRequest {
  currency: string;
  customerName: string;
  description: string;
  email: string;
  expiryDate: string;
  id: {
    uuid: string;
    version?: string;
  };
  items: SmobilpayOrderItem[];
  langKey: string;
  merchantReference: string;
  merchantCode: string;
  serviceId: number;
  orderDate: string;
  phoneNumber?: string;
  totalAmount: number;
  returnUrl: string;
  notificationUrl: string;

  // on garde optionnels, mais on ne les envoie plus pour l’instant
  optRefOne?: string;
  optRefTwo?: string;
  receiptUrl?: string;
}

export interface SmobilpayCreateOrderResult {
  donationId: string;
  provider: string;
  reference: string;
  transactionId: string | null;
  paymentUrl: string | null;
  status: string;
  raw: any;
}

type SmobilpayWalletConfig = {
  merchantCode: string;
  serviceId: number;
  provider: string;
};

const generateMerchantReference = (prefix = "LNF-DON"): string => {
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${Date.now()}-${rand}`;
};

const cleanPhoneNumber = (phone?: string): string | undefined => {
  if (!phone) return undefined;

  const cleaned = phone.replace(/[^\d]/g, "");

  if (cleaned.startsWith("237") && cleaned.length === 12) {
    return cleaned.slice(3);
  }

  return cleaned;
};

const buildOrderItemsFromDonation = (
  donation: IDonation
): SmobilpayOrderItem[] => {
  return [
    {
      itemId: String(donation._id),
      particulars: donation.message?.trim() || "Donation Lap Nomba Foundation",
      quantity: 1,
      subTotal: donation.amount,
      unitCost: donation.amount,
    },
  ];
};

const buildReturnUrl = (donationId: string, donation?: IDonation): string => {
  const separator = smobilpayConfig.returnUrl.includes("?") ? "&" : "?";
  const methodPart = donation?.paymentMethod
    ? `&method=${encodeURIComponent(donation.paymentMethod)}`
    : "";

  return `${smobilpayConfig.returnUrl}${separator}donationId=${encodeURIComponent(
    donationId
  )}${methodPart}`;
};

const buildNotificationUrl = (): string => {
  return smobilpayConfig.callbackUrl;
};

const getWalletConfigFromDonation = (
  donation: IDonation
): SmobilpayWalletConfig => {
  switch (donation.paymentMethod) {
    case "ORANGE_MONEY":
      return {
        merchantCode: smobilpayConfig.orangeMoneyMerchantCode,
        serviceId: smobilpayConfig.orangeMoneyServiceId,
        provider: "OM",
      };

    case "MOMO":
      return {
        merchantCode: smobilpayConfig.mtnMomoMerchantCode,
        serviceId: smobilpayConfig.mtnMomoServiceId,
        provider: "MOMO",
      };

    case "CARD":
      return {
        merchantCode:
          process.env.SMOBILPAY_CARD_MERCHANT_CODE ||
          smobilpayConfig.orangeMoneyMerchantCode,
        serviceId: Number(process.env.SMOBILPAY_CARD_SERVICE_ID || 0),
        provider: "CARD",
      };

    default:
      throw new Error(
        `Méthode de paiement non supportée par Smobilpay: ${donation.paymentMethod}`
      );
  }
};

const buildOrderPayloadFromDonation = (
  donation: IDonation
): SmobilpayOrderRequest => {
  const now = new Date();
  const expiryDate = new Date(now.getTime() + 30 * 60 * 1000);
  const merchantReference =
    donation.providerReference || generateMerchantReference();

  const walletConfig = getWalletConfigFromDonation(donation);

  const payload: SmobilpayOrderRequest = {
    currency: donation.currency || smobilpayConfig.defaultCurrency,
    customerName: donation.donorName,
    description: donation.message?.trim() || "Donation Lap Nomba Foundation",
    email: donation.donorEmail,
    expiryDate: expiryDate.toISOString(),
    id: {
      uuid: crypto.randomUUID(),
      // version retirée du payload de debug pour éviter les incompatibilités
      // version: smobilpayConfig.orderVersion,
    },
    items: buildOrderItemsFromDonation(donation),
    langKey: smobilpayConfig.defaultLangKey,
    merchantReference,
    merchantCode: walletConfig.merchantCode,
    serviceId: walletConfig.serviceId,
    orderDate: now.toISOString(),
    phoneNumber: cleanPhoneNumber(donation.donorPhone),
    totalAmount: donation.amount,
    returnUrl: buildReturnUrl(String(donation._id), donation),
    notificationUrl: buildNotificationUrl(),
  };

  return payload;
};

const extractTransactionId = (data: any): string | null => {
  return (
    data?.txid ||
    data?.transactionId ||
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

export const createSmobilpayOrderForDonation = async (
  donationId: string
): Promise<SmobilpayCreateOrderResult> => {
  const donation = await DonationModel.findById(donationId);

  if (!donation) {
    throw new Error("Don introuvable.");
  }

  if (donation.status === "COMPLETED") {
    return {
      donationId: String(donation._id),
      provider: donation.provider || "MAVIANCE",
      reference: donation.providerReference || "",
      transactionId: donation.providerTransactionId || null,
      paymentUrl: donation.providerPaymentUrl || null,
      status: donation.status,
      raw: donation.providerResponse || null,
    };
  }

  if (
    donation.paymentMethod === "BANK_TRANSFER" ||
    donation.paymentMethod === "CASH"
  ) {
    throw new Error(
      "Ce type de paiement ne doit pas être initialisé via Smobilpay Purchase API."
    );
  }

  const payload = buildOrderPayloadFromDonation(donation);

  logger.info("📤 Création commande Smobilpay", {
    donationId,
    merchantReference: payload.merchantReference,
    merchantCode: payload.merchantCode,
    serviceId: payload.serviceId,
    phoneNumber: payload.phoneNumber,
    amount: payload.totalAmount,
    currency: payload.currency,
  });

  logger.info("📦 Payload Smobilpay envoyé", payload);

  const response = await smobilpayPost<any>(smobilpayConfig.orderUrl, payload);

  logger.info("📥 Réponse Smobilpay brute", response.data);

  const transactionId = extractTransactionId(response.data);
  const paymentUrl = extractPaymentUrl(response.data);
  const rawStatus = extractRawStatus(response.data);

  donation.providerReference = payload.merchantReference;
  donation.providerOrderId = payload.merchantReference;
  donation.providerTransactionId = transactionId || undefined;
  donation.providerPaymentUrl = paymentUrl || undefined;
  donation.providerStatusRaw = rawStatus;
  donation.providerResponse = response.data;

  await donation.save();

  return {
    donationId: String(donation._id),
    provider: donation.provider || "MAVIANCE",
    reference: donation.providerReference,
    transactionId,
    paymentUrl,
    status: donation.status,
    raw: response.data,
  };
};

export const getSmobilpayOrderStatusByTxid = async (
  txid: string
): Promise<any> => {
  if (!txid?.trim()) {
    throw new Error("txid requis.");
  }

  const response = await smobilpayGet<any>(smobilpayConfig.orderStatusUrl, {
    txid,
  });

  logger.info("📥 Statut Smobilpay par txid", response.data);

  return response.data;
};

export const getSmobilpayOrderStatusByMerchantReference = async (
  merchantReference: string
): Promise<any> => {
  if (!merchantReference?.trim()) {
    throw new Error("orderMerchantId requis.");
  }

  const response = await smobilpayGet<any>(smobilpayConfig.orderStatusUrl, {
    orderMerchantId: merchantReference,
  });

  logger.info("📥 Statut Smobilpay par merchantReference", response.data);

  return response.data;
};

export const getSmobilpayOrderDetailsByTxid = async (
  txid: string
): Promise<any> => {
  if (!txid?.trim()) {
    throw new Error("txid requis.");
  }

  const response = await smobilpayGet<any>(smobilpayConfig.orderDetailsUrl, {
    txid,
  });

  logger.info("📥 Détails Smobilpay par txid", response.data);

  return response.data;
};

export const verifyAndSyncDonationWithSmobilpay = async (
  donationId: string
): Promise<IDonation> => {
  const donation = await DonationModel.findById(donationId);

  if (!donation) {
    throw new Error("Don introuvable.");
  }

  let statusResponse: any = null;

  if (donation.providerTransactionId) {
    statusResponse = await getSmobilpayOrderStatusByTxid(
      donation.providerTransactionId
    );
  } else if (donation.providerReference) {
    statusResponse = await getSmobilpayOrderStatusByMerchantReference(
      donation.providerReference
    );
  } else {
    throw new Error(
      "Impossible de vérifier le paiement : aucune référence provider n'est disponible."
    );
  }

  const rawStatus = extractRawStatus(statusResponse);
  donation.providerStatusRaw = rawStatus;
  donation.providerResponse = statusResponse;

  const normalized = rawStatus.toUpperCase().trim();

  if (["SUCCESS", "COMPLETED", "PAID", "APPROVED"].includes(normalized)) {
    if (donation.status !== "COMPLETED") {
      donation.status = "COMPLETED";
      donation.paidAt = new Date();
      donation.failedAt = undefined;
    }
  } else if (["FAILED", "ERROR", "DECLINED"].includes(normalized)) {
    donation.status = "FAILED";
    donation.failedAt = new Date();
  } else if (["CANCELED", "CANCELLED"].includes(normalized)) {
    donation.status = "CANCELED";
  } else if (normalized === "REFUNDED") {
    donation.status = "REFUNDED";
  } else {
    donation.status = "PENDING";
  }

  await donation.save();

  return donation;
};