import { DonationModel, providerFromPaymentMethod } from "../../../../models/donor";
import { CrowdfundingCampaignModel } from "../../../../models/crowdfunding_campaign";

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

      const slug = await generateUniqueSlug(input.title);

      const campaign = await CrowdfundingCampaignModel.create({
        title: input.title.trim(),
        slug,
        goalAmount: input.goalAmount,
        currency: normalizeCurrency(input.currency),
        story: input.story?.trim(),
        organizerName: input.organizerName.trim(),
        organizerEmail: input.organizerEmail.trim().toLowerCase(),
        coverImage: input.coverImage?.trim(),
        totalRaised: 0,
        donorsCount: 0,
        status: "ACTIVE",
      });

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