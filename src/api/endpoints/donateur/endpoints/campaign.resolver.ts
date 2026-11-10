import { DonationModel, providerFromPaymentMethod } from "../../../../models/donor";
import { CrowdfundingCampaignModel } from "../../../../models/crowdfunding_campaign";
import { ensureValidDonationAmount, ensureValidMobileMoneyPhone } from "./financia/helpers";
import { cleanLocalized } from "../../testimonials/resolvers";
import { UserInputError } from "apollo-server-express";
import { uploadFromBase64 } from "../../../../utils/cloudinary";
import { validateUploadedFile, FileValidationError } from "../../../../utils/fileValidation";

const COVER_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_COVER_BYTES = 4 * 1024 * 1024;

/**
 * Image de couverture choisie dans le back office :
 *  - « preset:<id> » (images proposées par le site de dons) ;
 *  - URL https (ex. image déjà sur Cloudinary) ;
 *  - image envoyée en data URI → téléversée sur Cloudinary (dossier « campaigns »).
 */
export const processCampaignCover = async (value: unknown): Promise<string> => {
  const v = typeof value === "string" ? value.trim() : "";
  if (/^preset:[a-z]{2,30}$/.test(v)) return v;
  if (/^https:\/\//i.test(v)) return v;
  if (!v.startsWith("data:")) throw new UserInputError("Image de couverture invalide.");
  try {
    validateUploadedFile(v, { allowedMimes: COVER_MIMES, maxBytes: MAX_COVER_BYTES, label: "Image" });
  } catch (error: any) {
    if (error instanceof FileValidationError) throw new UserInputError(error.message);
    throw error;
  }
  const uploaded = await uploadFromBase64(v, { folder: "campaigns", resource_type: "image" });
  return uploaded.secure_url;
};
import {
  isCampaignLanguage,
  isTranslationEnabled,
  scheduleCampaignTranslation,
  translateCampaign,
} from "../../../../services/campaignTranslation";

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");
};

const generateUniqueSlug = async (title: string): Promise<string> => {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let count = 1;

  while (await CrowdfundingCampaignModel.findOne({ slug })) {
    slug = `${baseSlug}-${count}`;
    count++;
  }

  return slug;
};

const normalizeCurrency = (currency?: string): string => {
  return (currency || "XAF").toUpperCase().trim();
};

const isValidEmail = (email?: string): boolean => {
  return !!email && email.includes("@");
};

export const campaignResolvers = {
  Query: {
    crowdfundingCampaigns: async (_: any, { limit }: { limit?: number }) => {
      const safeLimit = limit && limit > 0 ? limit : 50;

      return await CrowdfundingCampaignModel.find()
        .sort({ createdAt: -1 })
        .limit(safeLimit);
    },

    campaignBySlug: async (_: any, { slug }: { slug: string }) => {
      if (!slug?.trim()) {
        throw new Error("Le slug de la campagne est requis.");
      }

      return await CrowdfundingCampaignModel.findOne({ slug: slug.trim() });
    },
  },

  Mutation: {
    createCampaign: async (_: any, { input }: any) => {
      if (!input?.title?.trim()) {
        throw new Error("Le titre de la campagne est requis.");
      }

      if (!input?.organizerName?.trim()) {
        throw new Error("Le nom de l'organisateur est requis.");
      }

      if (!isValidEmail(input?.organizerEmail)) {
        throw new Error("L'email de l'organisateur est invalide.");
      }

      if (!input?.goalAmount || input.goalAmount <= 0) {
        throw new Error("Le montant cible doit être supérieur à 0.");
      }

      // Couverture : uniquement les images proposées par le site (« preset:<id> »),
      // jamais une URL externe arbitraire fournie par le public.
      const coverImage =
        typeof input?.coverImage === "string" && /^preset:[a-z]{2,30}$/.test(input.coverImage.trim())
          ? input.coverImage.trim()
          : undefined;

      if (input.title.trim().length > 90) {
        throw new Error("Le titre ne doit pas dépasser 90 caractères.");
      }
      if (input.story && input.story.length > 3000) {
        throw new Error("L'histoire ne doit pas dépasser 3000 caractères.");
      }
      ensureValidDonationAmount(input.goalAmount, input.currency);

      const slug = await generateUniqueSlug(input.title);

      const campaign = await CrowdfundingCampaignModel.create({
        title: input.title.trim(),
        slug,
        goalAmount: input.goalAmount,
        currency: normalizeCurrency(input.currency),
        story: input.story?.trim(),
        organizerName: input.organizerName.trim(),
        organizerEmail: input.organizerEmail.trim().toLowerCase(),
        coverImage,
        // Indice seulement (langue de l'interface) : la langue réelle est
        // détectée lors de la traduction automatique.
        originalLanguage: isCampaignLanguage(input.originalLanguage) ? input.originalLanguage : undefined,
        translationPending: isTranslationEnabled(),
        totalRaised: 0,
        donorsCount: 0,
        status: "ACTIVE",
      });

      // Traduction fr/en/tr/ar en arrière-plan : ne bloque jamais la création.
      scheduleCampaignTranslation(String(campaign._id));

      return campaign;
    },

    // --- ADMIN (voir accessControl.ts) ---------------------------------

    /** Correction manuelle des traductions par l'équipe. */
    updateCampaignTranslations: async (
      _: any,
      { id, originalLanguage, titleI18n, storyI18n }: { id: string; originalLanguage?: string; titleI18n?: any; storyI18n?: any }
    ) => {
      if (originalLanguage && !isCampaignLanguage(originalLanguage)) {
        throw new Error("Langue non prise en charge.");
      }
      const update: Record<string, unknown> = { translationPending: false, translationError: null };
      if (originalLanguage) update.originalLanguage = originalLanguage;
      if (titleI18n !== undefined) update.titleI18n = cleanLocalized(titleI18n) ?? {};
      if (storyI18n !== undefined) update.storyI18n = cleanLocalized(storyI18n) ?? {};
      const campaign = await CrowdfundingCampaignModel.findByIdAndUpdate(id, update, { new: true });
      if (!campaign) throw new Error("Campagne introuvable.");
      return campaign;
    },

    /**
     * Modifie le titre / l'histoire d'une collecte (back office). L'adresse
     * (slug) ne change pas : les liens déjà partagés restent valables.
     * Le nouveau texte est retraduit automatiquement en arrière-plan.
     */
    updateCampaignContent: async (_: any, { id, title, story }: { id: string; title?: string; story?: string }) => {
      const update: Record<string, unknown> = {};
      if (title !== undefined) {
        const t = (title || "").trim();
        if (!t) throw new UserInputError("Le titre de la campagne est requis.");
        if (t.length > 90) throw new UserInputError("Le titre ne doit pas dépasser 90 caractères.");
        update.title = t;
      }
      if (story !== undefined) {
        const st = (story || "").trim();
        if (st.length > 3000) throw new UserInputError("L'histoire ne doit pas dépasser 3000 caractères.");
        update.story = st;
      }
      if (!Object.keys(update).length) throw new UserInputError("Rien à modifier.");
      update.translationPending = isTranslationEnabled();
      update.translationError = null;
      const campaign = await CrowdfundingCampaignModel.findByIdAndUpdate(id, update, { new: true });
      if (!campaign) throw new Error("Campagne introuvable.");
      scheduleCampaignTranslation(String(campaign._id));
      return campaign;
    },

    /** Change l'image de couverture d'une collecte (back office). */
    updateCampaignCover: async (_: any, { id, coverImage }: { id: string; coverImage: string }) => {
      const cover = await processCampaignCover(coverImage);
      const campaign = await CrowdfundingCampaignModel.findByIdAndUpdate(id, { coverImage: cover }, { new: true });
      if (!campaign) throw new Error("Campagne introuvable.");
      return campaign;
    },

    /** Relance la traduction automatique (écrase les traductions existantes). */
    retranslateCampaign: async (_: any, { id }: { id: string }) => {
      if (!isTranslationEnabled()) {
        throw new Error("Traduction automatique indisponible (OPENAI_API_KEY non configurée).");
      }
      const status = await translateCampaign(id, { force: true });
      const campaign = await CrowdfundingCampaignModel.findById(id);
      if (!campaign) throw new Error("Campagne introuvable.");
      if (status === "failed") throw new Error(campaign.translationError || "Échec de la traduction.");
      return campaign;
    },

    donateToCampaign: async (_: any, { input }: any) => {
      if (!input?.campaignSlug?.trim()) {
        throw new Error("Le slug de la campagne est requis.");
      }

      const campaign = await CrowdfundingCampaignModel.findOne({
        slug: input.campaignSlug.trim(),
      });

      if (!campaign) {
        throw new Error("Campagne introuvable.");
      }

      if (!input?.donorName?.trim()) {
        throw new Error("Le nom du donateur est requis.");
      }

      if (!isValidEmail(input?.donorEmail)) {
        throw new Error("Adresse email invalide.");
      }

      if (!input?.amount || input.amount <= 0) {
        throw new Error("Le montant du don doit être supérieur à 0.");
      }

      const paymentMethod = input.paymentMethod;

      if (!paymentMethod) {
        throw new Error("Le moyen de paiement est requis.");
      }

      if (paymentMethod === "BANK_TRANSFER") {
        throw new Error(
          "Pour un don de campagne par virement, utilise le flux dédié createBankTransferDonation avec campaignId."
        );
      }

      ensureValidDonationAmount(input.amount, input.currency || campaign.currency);
      ensureValidMobileMoneyPhone(paymentMethod, input.donorPhone);

      if (paymentMethod === "CASH") {
        throw new Error("Le paiement CASH n'est pas pris en charge pour ce flux.");
      }

      const provider = providerFromPaymentMethod(paymentMethod);

      const donation = await DonationModel.create({
        donorName: input.donorName.trim(),
        donorEmail: input.donorEmail.trim().toLowerCase(),
        donorPhone: input.donorPhone?.trim(),
        anonymous: input.anonymous ?? false,

        category: "CROWDFUNDING",
        amount: input.amount,
        currency: normalizeCurrency(input.currency || campaign.currency),
        message: input.message?.trim(),
        futureContact: input.futureContact ?? false,

        paymentMethod,
        status: "PENDING",

        provider,
        campaignId: campaign._id,
      });

      return donation;
    },
  },
};