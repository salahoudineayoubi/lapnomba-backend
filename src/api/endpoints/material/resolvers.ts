import { MaterialDonationModel } from "../../../models/material";
import { sendMail } from "../../../utils/sendMail";

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
      // Création dans MongoDB
      const material = new MaterialDonationModel({
        donorName: input.nom,
        donorPhone: input.telephone,
        donorEmail: input.email,
        itemType: input.typeMateriel,
        condition: input.etatMateriel,
        quantity: input.quantite,
        deliveryMode: input.modeLivraison,
        pickupAddress: input.adresse,
        notes: input.details,
      });

      await material.save();

      // 1️⃣ Email à la Fondation
      await sendMail(
        "contact@lapnomba.org",
        "Nouveau don de matériel - Fondation Lap Nomba",
        `
Un nouveau don de matériel a été soumis :

Nom : ${input.nom}
Téléphone : ${input.telephone}
Email : ${input.email || "Non fourni"}

Matériel : ${input.typeMateriel}
État : ${input.etatMateriel}
Quantité : ${input.quantite}

Mode de livraison : ${input.modeLivraison}
Adresse : ${input.adresse || "Non applicable"}

Détails :
${input.details || "Aucun"}
        `
      );

      // 2️⃣ Email au Donateur
      if (input.email) {
        await sendMail(
          input.email,
          "Confirmation de votre don - Fondation Lap Nomba",
          `
Cher(e) ${input.nom},

Nous avons bien reçu votre proposition de don :

Matériel : ${input.typeMateriel}
Quantité : ${input.quantite}
État : ${input.etatMateriel}

Notre équipe vous contactera très prochainement pour organiser la récupération ou la livraison.

La Fondation Lap Nomba vous remercie sincèrement pour votre engagement dans la réduction de la fracture numérique et le soutien à l’éducation.

Avec gratitude,

Fondation Lap Nomba
contact@lapnomba.org
          `
        );
      }

      // Mapping correct pour GraphQL
      return {
        id: material._id,
        nom: material.donorName,
        telephone: material.donorPhone,
        email: material.donorEmail,
        typeMateriel: material.itemType,
        etatMateriel: material.condition,
        quantite: material.quantity,
        modeLivraison: material.deliveryMode,
        adresse: material.pickupAddress,
        details: material.notes,
        status: material.status,
        createdAt: material.createdAt.toISOString(),
        updatedAt: material.updatedAt.toISOString(),
      };
    },

    deleteMaterial: async (_: any, { id }: { id: string }) => {
      const res = await MaterialDonationModel.findByIdAndDelete(id);
      return !!res;
    },
  },
};