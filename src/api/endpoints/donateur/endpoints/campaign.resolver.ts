import { CrowdfundingCampaignModel } from "../../../../models/crowdfunding_campaign";

// Helper pour transformer "Ma Belle Collecte !" en "ma-belle-collecte"
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Supprime les accents
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')     // Remplace espaces par -
    .replace(/[^\w-]+/g, '')  // Supprime tout ce qui n'est pas mot ou -
    .replace(/--+/g, '-');    // Évite les doubles --
};

export const campaignResolvers = {
  Query: {
    crowdfundingCampaigns: async (_: any, { limit }: { limit?: number }) => {
      return await CrowdfundingCampaignModel.find({ status: "ACTIVE" })
        .sort({ createdAt: -1 })
        .limit(limit || 12);
    },
    campaignBySlug: async (_: any, { slug }: { slug: string }) => {
      return await CrowdfundingCampaignModel.findOne({ slug: slug.toLowerCase() });
    },
  },

  Mutation: {
    createCampaign: async (_: any, { input }: any) => {
      // 1. Génération du slug à partir du titre
      let generatedSlug = slugify(input.title);

      // 2. Vérification d'unicité (si doublon, on ajoute un timestamp court)
      const existing = await CrowdfundingCampaignModel.findOne({ slug: generatedSlug });
      if (existing) {
        generatedSlug = `${generatedSlug}-${Math.floor(Math.random() * 1000)}`;
      }

      // 3. Création avec les nouveaux noms de champs
      const campaign = await CrowdfundingCampaignModel.create({
        ...input,
        slug: generatedSlug,
        totalRaised: 0,
        donorsCount: 0,
        status: "ACTIVE",
      });

      return campaign;
    },
  },
};