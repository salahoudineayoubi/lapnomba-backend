import { MaterialDonationModel } from "../../../../models/material";

export const materialDonationResolvers = {
  Mutation: {
    createMaterialDonation: async (_: any, { input }: any) => {
      // Validation : adresse requise si PICKUP ou SHIPPING
      if (
        (input.deliveryMode === "PICKUP" || input.deliveryMode === "SHIPPING") &&
        !input.pickupAddress
      ) {
        throw new Error("Adresse requise pour le ramassage ou la livraison.");
      }

      const material = await MaterialDonationModel.create({
        donorName: input.donorName,
        donorPhone: input.donorPhone,
        donorEmail: input.donorEmail,
        itemType: input.itemType,
        condition: input.condition,
        quantity: input.quantity,
        deliveryMode: input.deliveryMode,
        pickupAddress: input.pickupAddress,
        notes: input.notes,
        status: "PENDING",
      });

      return material;
    },
  },
};