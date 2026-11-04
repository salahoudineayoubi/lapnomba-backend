import AcademyPayment from "../../../../../models/acdemy/payment";
import AcademyEnrollment from "../../../../../models/acdemy/enrollment";
import { requireAdmin, GraphQLContext } from "../../../../../utils/auth";
import { checkRateLimit, RateLimitExceededError } from "../../../../../utils/rateLimiter";

import {
  initiateAcademyPayment,
  verifyAcademyPaymentByMerchantReference,
  verifyAcademyPaymentByTxid,
} from "../../../../../services/academyPayment/academyPayment.service";

// `initiateAcademyPayment`/`verifyAcademyPayment` restent PUBLIC — c'est le
// flux de paiement en ligne réel (voir academy_payment/index.tsx et
// academy_payment/return/index.tsx). Tout le reste (lecture/écriture directe
// des paiements) est admin-only : la création légitime d'un paiement passe
// par initiateAcademyPayment, jamais par createAcademyPayment côté client.
const ACADEMY_PAYMENT_INIT_RATE_LIMIT = { maxRequests: 10, windowMs: 15 * 60 * 1000 };

const mapSmobilpayStatusToAcademyStatus = (
  rawStatus?: string
): "pending" | "completed" | "failed" | "canceled" | "refunded" => {
  const normalized = (rawStatus || "").toUpperCase().trim();

  if (
    [
      "CONFIRMED",
      "SUCCESS",
      "SUCCESSFUL",
      "COMPLETED",
      "COMPLETE",
      "PAID",
      "APPROVED",
    ].includes(normalized)
  ) {
    return "completed";
  }

  if (
    ["FAILED", "FAIL", "ERROR", "DECLINED", "REJECTED"].includes(normalized)
  ) {
    return "failed";
  }

  if (["CANCELED", "CANCELLED"].includes(normalized)) {
    return "canceled";
  }

  if (normalized === "REFUNDED") {
    return "refunded";
  }

  return "pending";
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

const updateEnrollmentPaymentStatus = async (payment: any) => {
  if (payment.status !== "completed") return;

  await AcademyEnrollment.findByIdAndUpdate(payment.enrollmentId, {
    paymentStatus: payment.paymentType === "full" ? "paye" : "partiel",
  });
};

export const academyPaymentResolvers = {
  Query: {
    academyPayments: async (_: any, __: any, context: GraphQLContext) => {
      requireAdmin(context);
      return await AcademyPayment.find().sort({ createdAt: -1 });
    },

    academyPaymentById: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      requireAdmin(context);
      return await AcademyPayment.findById(id);
    },

    academyPaymentsByEnrollment: async (
      _: any,
      { enrollmentId }: { enrollmentId: string },
      context: GraphQLContext
    ) => {
      requireAdmin(context);
      return await AcademyPayment.find({ enrollmentId }).sort({
        createdAt: -1,
      });
    },
  },

  Mutation: {
    createAcademyPayment: async (_: any, { input }: any, context: GraphQLContext) => {
      requireAdmin(context);

      const payment = new AcademyPayment({
        ...input,
        currency: input.currency || "XAF",
        paymentType: input.paymentType || "monthly",
        status: input.status || "pending",
      });

      await payment.save();

      await updateEnrollmentPaymentStatus(payment);

      return payment;
    },

    updateAcademyPayment: async (_: any, { input }: any, context: GraphQLContext) => {
      requireAdmin(context);

      const { id, ...updates } = input;

      const payment = await AcademyPayment.findByIdAndUpdate(id, updates, {
        new: true,
      });

      if (!payment) {
        throw new Error("Paiement Academy introuvable.");
      }

      await updateEnrollmentPaymentStatus(payment);

      return payment;
    },

    deleteAcademyPayment: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      requireAdmin(context);
      const deleted = await AcademyPayment.findByIdAndDelete(id);
      return !!deleted;
    },

    // Public — déclenché par le candidat depuis academy_payment/index.tsx.
    initiateAcademyPayment: async (_: any, { input }: any, context: GraphQLContext) => {
      try {
        checkRateLimit(`academy-payment-initiate:${context?.ip || "unknown"}`, ACADEMY_PAYMENT_INIT_RATE_LIMIT);
        return await initiateAcademyPayment(input);
      } catch (error: any) {
        if (error instanceof RateLimitExceededError) {
          throw error;
        }
        console.error("❌ Erreur initiateAcademyPayment:", error);
        throw new Error(
          error?.message || "Erreur lors de l'initialisation du paiement."
        );
      }
    },

    // Public — polling de statut après redirection depuis le provider
    // (voir academy_payment/return/index.tsx). Le statut réel est vérifié
    // auprès de Smobilpay, jamais accepté tel quel depuis le client.
    verifyAcademyPayment: async (_: any, { id }: { id: string }) => {
      const payment = await AcademyPayment.findById(id);

      if (!payment) {
        throw new Error("Paiement Academy introuvable.");
      }

      let statusResponse: any = null;

      if (payment.providerTransactionId) {
        statusResponse = await verifyAcademyPaymentByTxid(
          payment.providerTransactionId
        );
      } else if (payment.providerReference) {
        statusResponse = await verifyAcademyPaymentByMerchantReference(
          payment.providerReference
        );
      } else {
        throw new Error(
          "Impossible de vérifier le paiement : aucune référence provider disponible."
        );
      }

      const rawStatus = extractRawStatus(statusResponse);
      const mappedStatus = mapSmobilpayStatusToAcademyStatus(rawStatus);

      payment.note = rawStatus;
      payment.status = mappedStatus;

      if (mappedStatus === "completed") {
        payment.paidAt = new Date();
      }

      await payment.save();

      await updateEnrollmentPaymentStatus(payment);

      return payment;
    },
  },
};