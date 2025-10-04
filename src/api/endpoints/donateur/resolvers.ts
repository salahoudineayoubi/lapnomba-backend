import { AppDataSource } from "../../../data-source";
import { Donateur } from "../../../models/donor";
import { getOrangeToken } from "../../../utils/orange_token";
const donateurRepo = AppDataSource.getRepository(Donateur);

export const donateurResolvers = {
  Query: {
    donateurs: async () => donateurRepo.find(),
    donateur: async (_: any, { id }: { id: number }) =>
      donateurRepo.findOne({ where: { id } }),
    donateurStats: async () => {
      const [result] = await donateurRepo
        .createQueryBuilder("donateur")
        .select("SUM(donateur.montant)", "totalMontant")
        .addSelect("COUNT(donateur.id)", "nombreDonateurs")
        .getRawMany();

      return {
        totalMontant: Number(result?.totalMontant) || 0,
        nombreDonateurs: Number(result?.nombreDonateurs) || 0,
      };
    },
  },
  Mutation: {
    createDonateur: async (
      _: any,
      {
        nom,
        email,
        montant,
        typePaiement,
        numeroMobileMoney,
        bankName,
        bankAccount,
        bankSwift,
        commentaire,
        futureContact,
      }: any
    ) => {
      // Gestion des tokens selon le type de paiement
      if (typePaiement === "orange_money") {
        const token = await getOrangeToken();
        console.log("Token Orange Money:", token);
        // Ici tu peux appeler la fonction pour initier le paiement Orange
      }
      // Ajoute ici la logique pour MTN, Visa, etc. si besoin

      const donateur = donateurRepo.create({
        nom,
        email,
        montant,
        typePaiement,
        numeroMobileMoney,
        bankName,
        bankAccount,
        bankSwift,
        commentaire,
        futureContact,
      });
      return donateurRepo.save(donateur);
    },

    updateDonateur: async (_: any, { id, ...fields }: any) => {
      const donateur = await donateurRepo.findOne({ where: { id } });
      if (!donateur) throw new Error("Donateur non trouvé");
      Object.assign(donateur, fields);
      return donateurRepo.save(donateur);
    },

    deleteDonateur: async (_: any, { id }: { id: number }) => {
      const result = await donateurRepo.delete(id);
      return result.affected !== 0;
    },
  },
};