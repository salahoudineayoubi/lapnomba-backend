import { DonationModel } from "../../models/donor";
import AcademyPayment from "../../models/acdemy/payment";
import logger from "../../utils/logger";
import { confirmDonationPayment } from "../../api/endpoints/donateur/endpoints/financia/completion";
import { confirmAcademyPaymentWithProvider } from "../academyPayment/academyPayment.service";

/**
 * Webhook Smobilpay = simple DÉCLENCHEUR.
 *
 * Le corps de la requête n'est pas authentifié : on n'y lit que la référence
 * pour retrouver le don ou le paiement Academy concerné, puis on relit le
 * statut réel chez Smobilpay (mêmes fonctions que le polling du site).
 * Le champ `status` envoyé dans le webhook n'est jamais utilisé.
 */
const extractReferences = (payload: any) => ({
  providerReference:
    payload?.reference ||
    payload?.providerReference ||
    payload?.merchantReference ||
    payload?.externalReference ||
    payload?.orderId ||
    payload?.transactionRef ||
    null,
  transactionId:
    payload?.transactionId ||
    payload?.providerTransactionId ||
    payload?.transactionRef ||
    payload?.trxId ||
    payload?.txid ||
    null,
});

const findByReferences = async (model: any, providerReference: string | null, transactionId: string | null) => {
  if (providerReference) {
    const found = await model.findOne({ providerReference: String(providerReference) });
    if (found) return found;
  }
  if (transactionId) {
    return await model.findOne({ providerTransactionId: String(transactionId) });
  }
  return null;
};

export const handleSmobilpayWebhook = async (
  payload: any
): Promise<{ matched: boolean; type?: "donation" | "academy_payment"; status?: string }> => {
  const { providerReference, transactionId } = extractReferences(payload);

  logger.info("📩 Webhook Smobilpay reçu", { providerReference, transactionId });

  const donation = await findByReferences(DonationModel, providerReference, transactionId);
  if (donation) {
    donation.webhookPayload = payload;
    await donation.save();
    const confirmed = await confirmDonationPayment(String(donation._id));
    return { matched: true, type: "donation", status: confirmed.status };
  }

  const academyPayment = await findByReferences(AcademyPayment, providerReference, transactionId);
  if (academyPayment) {
    const confirmed = await confirmAcademyPaymentWithProvider(String(academyPayment._id));
    return { matched: true, type: "academy_payment", status: confirmed.status };
  }

  logger.warn("⚠️ Webhook Smobilpay sans don ni paiement Academy correspondant", {
    providerReference,
    transactionId,
  });

  return { matched: false };
};
