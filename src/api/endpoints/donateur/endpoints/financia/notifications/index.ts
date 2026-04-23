import logger from "../../../../../../utils/logger";
import { generateAndSendReceipt } from "../../../../../../utils/receipt";
import { sendMail } from "../../../../../../utils/sendMail";
import { donationMessages } from "../message";

const buildThankYouEmailHtml = (donation: any): string => {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 16px;">Merci pour votre soutien</h2>

      <p>Bonjour ${donation?.donorName || "Cher donateur"},</p>

      <p>
        Nous vous remercions sincèrement pour votre contribution de
        <strong>${donation?.amount} ${donation?.currency}</strong>
        à Lap Nomba Foundation.
      </p>

      <p>
        Votre geste contribue directement à notre mission de sensibilisation,
        de formation et d’intégration des jeunes vers des opportunités
        numériques éthiques et durables.
      </p>

      <p>
        Votre paiement a bien été confirmé. Un reçu vous sera également transmis.
      </p>

      <p>
        Avec toute notre gratitude,<br />
        <strong>Lap Nomba Foundation</strong>
      </p>
    </div>
  `;
};

const buildThankYouEmailText = (donation: any): string => {
  return `
Merci pour votre soutien

Bonjour ${donation?.donorName || "Cher donateur"},

Nous vous remercions sincèrement pour votre contribution de ${
    donation?.amount
  } ${donation?.currency} à Lap Nomba Foundation.

Votre geste contribue directement à notre mission de sensibilisation, de formation et d’intégration des jeunes vers des opportunités numériques éthiques et durables.

Votre paiement a bien été confirmé. Un reçu vous sera également transmis.

Avec toute notre gratitude,
Lap Nomba Foundation
  `.trim();
};

export const sendReceiptSilently = (donation: any) => {
  generateAndSendReceipt(donation).catch((err) => {
    logger.error("Échec de la génération/envoi du reçu :", err);
  });
};

export const sendThankYouMailSilently = (donation: any) => {
  if (!donation?.donorEmail) return;

  sendMail({
    to: donation.donorEmail,
    subject: donationMessages.thankYouSubject,
    text: buildThankYouEmailText(donation),
    html: buildThankYouEmailHtml(donation),
  }).catch((err) => {
    logger.error("Échec de l'envoi du mail de remerciement :", err);
  });
};

export const sendCompletionNotificationsSilently = (donation: any) => {
  sendReceiptSilently(donation);
  sendThankYouMailSilently(donation);
};