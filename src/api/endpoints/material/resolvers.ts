import { MaterialDonationModel } from "../../../models/material";

export const materialResolvers = {
  Query: {
    materials: async () => {
      return await MaterialDonationModel.find().sort({ createdAt: -1 });
    },

    material: async (_: any, { id }: { id: string }) => {
      return await MaterialDonationModel.findById(id);
    },
  },

  Mutation: {
    createMaterial: async (_: any, { input }: any) => {
      if (!input?.nom?.trim()) {
        throw new Error("Le nom du donateur est requis.");
      }

      if (!input?.typeMateriel?.trim()) {
        throw new Error("Le type de matériel est requis.");
      }

      if (!input?.quantite || input.quantite <= 0) {
        throw new Error("La quantité doit être supérieure à 0.");
      }

      const material = await MaterialDonationModel.create({
        donorName: input.nom.trim(),
        donorPhone: input.telephone?.trim(),
        donorEmail: input.email?.trim()?.toLowerCase(),
        itemType: input.typeMateriel.trim(),
        quantity: input.quantite,
        description: input.details?.trim(),
        status: "PENDING",
      });

      return material;
    },

    deleteMaterial: async (_: any, { id }: { id: string }) => {
      const result = await MaterialDonationModel.deleteOne({ _id: id });
      return result.deletedCount > 0;
    },
  },

  Material: {
    id: (parent: any) => parent._id?.toString(),
    nom: (parent: any) => parent.donorName,
    telephone: (parent: any) => parent.donorPhone || null,
    email: (parent: any) => parent.donorEmail || null,
    typeMateriel: (parent: any) => parent.itemType,
    quantite: (parent: any) => parent.quantity,
    details: (parent: any) => parent.description || null,
    status: (parent: any) => parent.status,
    createdAt: (parent: any) =>
      parent.createdAt ? new Date(parent.createdAt).toISOString() : null,
    updatedAt: (parent: any) =>
      parent.updatedAt ? new Date(parent.updatedAt).toISOString() : null,
  },
};