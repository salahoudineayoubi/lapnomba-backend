import { MaterialDonationModel } from "../../../../models/material";

export const materialDonationResolvers = {
  Query: {
    materialDonations: async () => {
      return await MaterialDonationModel.find().sort({ createdAt: -1 });
    },
  },

  Mutation: {
    createMaterialDonation: async (_: any, { input }: any) => {
      if (!input?.donorName?.trim()) {
        throw new Error("Le nom du donateur est requis.");
      }

      if (!input?.itemType?.trim()) {
        throw new Error("Le type d'objet est requis.");
      }

      if (!input?.quantity || input.quantity <= 0) {
        throw new Error("La quantité doit être supérieure à 0.");
      }

      const materialDonation = await MaterialDonationModel.create({
        donorName: input.donorName.trim(),
        donorEmail: input.donorEmail?.trim()?.toLowerCase(),
        donorPhone: input.donorPhone?.trim(),
        itemType: input.itemType.trim(),
        quantity: input.quantity,
        description: input.description?.trim(),
        status: "PENDING",
      });

      return materialDonation;
    },
  },
};