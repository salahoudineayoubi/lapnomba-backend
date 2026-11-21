/**
 * Notifications à l'équipe dons (donate@lapnomba.org, voir
 * utils/internalNotifications.ts) — une par don confirmé, une par promesse de
 * don matériel, une par demande de parrainage. Toujours non bloquant.
 */
import { CrowdfundingCampaignModel } from "../../../../../../models/crowdfunding_campaign";
import logger from "../../../../../../utils/logger";
import {
  adminLink,
  buildInternalMail,
  formatAmount,
  formatDateFr,
  getDonationNotificationEmail,
  safeSubject,
  sendInternalMailSilently,
} from "../../../../../../utils/internalNotifications";

const METHOD_LABEL: Record<string, string> = {
  MOMO: "MTN Mobile Money",
  ORANGE_MONEY: "Orange Money",
  CARD: "Carte bancaire",
  CRYPTO: "Crypto",
  BANK_TRANSFER: "Virement bancaire",
  CASH: "Espèces",
};

const CATEGORY_LABEL: Record<string, string> = {
  FINANCIAL: "Don financier",
  MATERIAL: "Don matériel",
  SPONSORSHIP: "Parrainage",
  CROWDFUNDING: "Campagne de financement",
};

const campaignTitle = async (campaignId?: unknown): Promise<string | undefined> => {
  if (!campaignId) return undefined;
  try {
    const c = await CrowdfundingCampaignModel.findById(campaignId).select("title").lean();
    return (c as any)?.title;
  } catch {
    return undefined;
  }
};

/** Don financier (ou de campagne) confirmé — appelé une seule fois par don (completeDonationOnce). */
export const notifyTeamDonationCompleted = async (donation: any) => {
  try {
    const amount = formatAmount(donation?.amount, donation?.currency);
    const donor = donation?.anonymous ? `${donation?.donorName || "—"} (souhaite rester anonyme)` : donation?.donorName;
    const campaign = await campaignTitle(donation?.campaignId);
    const reference = donation?.providerReference || donation?.providerTransactionId || String(donation?._id || "");

    const body = buildInternalMail({
      title: `Nouveau don confirmé : ${amount}`,
      rows: [
        ["Montant", amount],
        ["Type", CATEGORY_LABEL[donation?.category] || donation?.category],
        ["Campagne", campaign],
        ["Donateur", donor],
        ["Email", donation?.donorEmail],
        ["Téléphone", donation?.donorPhone],
        ["Moyen de paiement", METHOD_LABEL[donation?.paymentMethod] || donation?.paymentMethod],
        ["Message du donateur", donation?.message],
        ["Date du paiement", formatDateFr(donation?.paidAt || donation?.updatedAt)],
        ["Référence", reference],
      ],
      ctaLabel: "Ouvrir les dons dans l'admin",
      ctaUrl: adminLink("/admin/financialdonation"),
    });

    sendInternalMailSilently(
      getDonationNotificationEmail(),
      safeSubject(`[Dons] ${amount} — ${donation?.donorName || "Donateur"}`),
      body,
      "don confirmé"
    );
  } catch (err) {
    logger.error("Échec de la préparation de la notification de don", {
      error: err instanceof Error ? err.message : err,
    });
  }
};

/** Promesse de don matériel enregistrée (statut PENDING). */
export const notifyTeamMaterialDonation = (m: any) => {
  const body = buildInternalMail({
    title: "Nouvelle proposition de don matériel",
    rows: [
      ["Objet", m?.itemType],
      ["Quantité", m?.quantity],
      ["Description", m?.description],
      ["Donateur", m?.donorName],
      ["Email", m?.donorEmail],
      ["Téléphone", m?.donorPhone],
      ["Date", formatDateFr(m?.createdAt)],
      ["Statut", "En attente de traitement"],
    ],
    ctaLabel: "Ouvrir les dons matériels dans l'admin",
    ctaUrl: adminLink("/admin/materials"),
  });
  sendInternalMailSilently(
    getDonationNotificationEmail(),
    safeSubject(`[Dons matériels] ${m?.quantity ?? ""} × ${m?.itemType || "objet"} — ${m?.donorName || "Donateur"}`),
    body,
    "don matériel"
  );
};

/** Demande de parrainage enregistrée (statut PENDING). */
export const notifyTeamSponsorship = (s: any) => {
  const amount = s?.amount ? formatAmount(s.amount, s.currency) : undefined;
  const body = buildInternalMail({
    title: "Nouvelle demande de parrainage",
    rows: [
      ["Parrain", s?.sponsorName],
      ["Email", s?.sponsorEmail],
      ["Téléphone", s?.sponsorPhone],
      ["Jeune parrainé", s?.studentName],
      ["Montant proposé", amount],
      ["Message", s?.message],
      ["Date", formatDateFr(s?.createdAt)],
      ["Statut", "En attente de traitement"],
    ],
    ctaLabel: "Ouvrir l'admin",
    ctaUrl: adminLink("/admin/dashboard"),
  });
  sendInternalMailSilently(
    getDonationNotificationEmail(),
    safeSubject(`[Parrainage] ${s?.sponsorName || "Nouveau parrain"}${amount ? ` — ${amount}` : ""}`),
    body,
    "parrainage"
  );
};
