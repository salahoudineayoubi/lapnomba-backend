import { DonationModel, IDonation } from "../../../../../models/donor";
import logger from "../../../../../utils/logger";
import { verifyAndSyncDonationWithSmobilpay } from "../../../../../services/smobilpay/smobilpay.service";
import { ensureCampaignStatsUpdated } from "./helpers";
import { sendCompletionNotificationsSilently } from "./notifications";

/**
 * Point UNIQUE de passage d'un don à COMPLETED.
 *
 * La transition est atomique (filtre `status != COMPLETED`) : si le polling
 * du site, le webhook Smobilpay et un admin confirment le même don en même
 * temps, un seul gagne — les stats de campagne et le reçu ne sont donc
 * déclenchés qu'une seule fois.
 */
export const completeDonationOnce = async (
  donationId: string
): Promise<{ donation: IDonation | null; justCompleted: boolean }> => {
  const updated = await DonationModel.findOneAndUpdate(
    { _id: donationId, status: { $ne: "COMPLETED" } },
    { $set: { status: "COMPLETED", paidAt: new Date() }, $unset: { failedAt: "" } },
    { new: true }
  );

  if (!updated) {
    return { donation: await DonationModel.findById(donationId), justCompleted: false };
  }

  await ensureCampaignStatsUpdated(updated);
  sendCompletionNotificationsSilently(updated);

  return { donation: updated, justCompleted: true };
};

/**
 * Vérifie un paiement en ligne auprès de Smobilpay puis, s'il est réellement
 * confirmé, le finalise via `completeDonationOnce`.
 * Utilisé par le polling du site (verifyDonationPayment) ET par le webhook :
 * le statut envoyé dans le corps du webhook n'est jamais cru tel quel.
 */
export const confirmDonationPayment = async (donationId: string): Promise<IDonation> => {
  const { donation, providerStatus } = await verifyAndSyncDonationWithSmobilpay(donationId);

  if (providerStatus !== "COMPLETED") {
    return donation;
  }

  const result = await completeDonationOnce(donationId);

  if (result.justCompleted) {
    logger.info("Don confirmé par Smobilpay", {
      donationId,
      providerReference: donation.providerReference,
      providerTransactionId: donation.providerTransactionId,
    });
  }

  return result.donation ?? donation;
};
