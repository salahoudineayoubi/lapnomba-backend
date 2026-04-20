import { financialDonationResolvers } from "./endpoints/financial.resolver";
import { materialDonationResolvers } from "./endpoints/materialDonation.resolver";
import { sponsorshipResolvers } from "./endpoints/sponsorship.resolver";
import { campaignResolvers } from "./endpoints/campaign.resolver";

export const donateurResolvers = {
  Query: {
    ...financialDonationResolvers.Query,
    ...campaignResolvers.Query,
    ...materialDonationResolvers.Query,
    ...sponsorshipResolvers.Query,
  },
  Mutation: {
    ...financialDonationResolvers.Mutation,
    ...materialDonationResolvers.Mutation,
    ...sponsorshipResolvers.Mutation,
    ...campaignResolvers.Mutation,
  },
};