import { financialDonationResolvers } from "./endpoints/financial.resolver";
import { materialDonationResolvers } from "./endpoints/materialDonation.resolver";
import { sponsorshipResolvers } from "./endpoints/sponsorship.resolver";
import { campaignResolvers } from "./endpoints/campaign.resolver";

export const donateurResolvers = {
  Query: {
    ...campaignResolvers.Query,
    ...financialDonationResolvers.Query, // Pour donationById
    // Ajoute ici d'autres queries si besoin
  },
  Mutation: {
    ...financialDonationResolvers.Mutation,
    ...materialDonationResolvers.Mutation,
    ...sponsorshipResolvers.Mutation,
    ...campaignResolvers.Mutation,
  }
};