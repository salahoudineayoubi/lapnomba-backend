/**
 * Envoie une notification de TEST aux boîtes de l'équipe (sans base de données, sans paiement)
 * pour vérifier la chaîne e-mail : configuration SMTP → boîte donate@ / training@ → téléphone.
 *
 * Usage : npm run test:notify            (donate@ par défaut)
 *         npm run test:notify -- training (training@)
 *         npm run test:notify -- vous@gmail.com   (n'importe quelle adresse : test de délivrabilité Gmail, Yahoo…)
 */
import dotenv from "dotenv";
dotenv.config();

import { sendMail } from "../utils/sendMail";
import { adminLink, buildInternalMail, formatAmount, formatDateFr, getDonationNotificationEmail } from "../utils/internalNotifications";

(async () => {
  const arg = process.argv[2];
  const target =
    arg === "training"
      ? process.env.TRAINING_NOTIFICATION_EMAIL || "training@lapnomba.org"
      : arg && arg.includes("@")
        ? arg
        : getDonationNotificationEmail();
  console.log(`Expéditeur : ${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER} via ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 465}`);
  const body = buildInternalMail({
    title: "TEST — notification de don",
    rows: [
      ["Montant", formatAmount(100, "XAF")],
      ["Donateur", "Test Lap Nomba"],
      ["Moyen de paiement", "MTN Mobile Money"],
      ["Date", formatDateFr(new Date())],
      ["Note", "Ceci est un test : aucun don réel n'a été effectué."],
    ],
    ctaLabel: "Ouvrir les dons dans l'admin",
    ctaUrl: adminLink("/admin/financialdonation"),
  });
  console.log(`Envoi d'un e-mail de test à ${target}…`);
  const info = await sendMail({ to: target, subject: "[TEST] Notification de don — Lap Nomba", ...body });
  console.log("✅ Accepté par le serveur SMTP.", { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected, response: info.response });
  process.exit(0);
})().catch((err) => {
  console.error("❌ Échec de l'envoi :", err instanceof Error ? err.message : err);
  process.exit(1);
});
