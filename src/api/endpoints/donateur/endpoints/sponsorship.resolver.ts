import { SponsorshipModel } from "../../../../models/sponsorship";

const normalizeCurrency = (currency?: string): string => {
  return (currency || "XAF").toUpperCase().trim();
};

export const sponsorshipResolvers = {
  Query: {
    sponsorships: async () => {
      return await SponsorshipModel.find().sort({ createdAt: -1 });
    },
  },

  Mutation: {
    createSponsorship: async (_: any, { input }: any) => {
      if (!input?.sponsorName?.trim()) {
        throw new Error("Le nom du sponsor est requis.");
      }

      if (input?.amount !== undefined && input.amount !== null && input.amount < 0) {
        throw new Error("Le montant du sponsoring ne peut pas être négatif.");
      }

      const sponsorship = await SponsorshipModel.create({
        sponsorName: input.sponsorName.trim(),
        sponsorEmail: input.sponsorEmail?.trim()?.toLowerCase(),
        sponsorPhone: input.sponsorPhone?.trim(),
        studentName: input.studentName?.trim(),
        amount: input.amount,
        currency: normalizeCurrency(input.currency),
        message: input.message?.trim(),
        status: "PENDING",
      });

      return sponsorship;
    },
  },
};