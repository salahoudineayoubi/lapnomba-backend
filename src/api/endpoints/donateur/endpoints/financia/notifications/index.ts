import logger from "../../../../../../utils/logger";
import { generateAndSendReceipt } from "../../../../../../utils/receipt";
import { sendMail } from "../../../../../../utils/sendMail";
import { buildThankYouEmail } from "./thankYou.i18n";
import { notifyTeamDonationCompleted } from "./team";

export const sendReceiptSilently = (donation: any) => {
  generateAndSendReceipt(donation).catch((err) => {
    logger.error("Échec de la génération/envoi du reçu :", err);
  });
};

export const sendThankYouMailSilently = (donation: any) => {
  if (!donation?.donorEmail) return;

  const mail = buildThankYouEmail(donation);
  sendMail({
    to: donation.donorEmail,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  }).catch((err) => {
    logger.error("Échec de l'envoi du mail de remerciement :", err);
  });
};

export const sendCompletionNotificationsSilently = (donation: any) => {
  sendReceiptSilently(donation);
  sendThankYouMailSilently(donation);
  void notifyTeamDonationCompleted(donation);
};