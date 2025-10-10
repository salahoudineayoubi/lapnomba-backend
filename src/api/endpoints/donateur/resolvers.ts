import { AppDataSource } from "../../../data-source";
import { Donateur } from "../../../models/donor";
import { getOrangeToken } from "../../../utils/orange_token";
import { bcAuthorize } from "../../../utils/mtn_token";
import { sendMail } from "../../../utils/sendMail"; 
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
      }
      if (typePaiement === "mtn_money") {
        const bearerToken = "fake-mtn-oauth-token";
        const targetEnvironment = "sandbox";
        try {
          const mtnAuth = await bcAuthorize(bearerToken, targetEnvironment);
          console.log("MTN bcAuthorize response:", mtnAuth);
        } catch (err) {
          console.error("Erreur MTN bcAuthorize:", err);
        }
      }

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
      const savedDonateur = await donateurRepo.save(donateur);

await sendMail(
  email,
  "🙏 Merci pour votre don — Vous soutenez la mission Lap Nomba !",
  `Bonjour ${nom},

Toute l’équipe de la Fondation Lap Nomba vous remercie sincèrement pour votre don de ${montant} XAF.

Votre contribution renforce nos actions pour l’éducation numérique, la formation des jeunes et la lutte contre la marginalisation par la technologie.

Grâce à votre générosité, nous pouvons continuer à inspirer, former et accompagner une nouvelle génération de jeunes Camerounais vers l’autonomie et l’innovation.

Rejoignez notre communauté WhatsApp pour suivre nos actions, nos formations et les projets que vous rendez possibles :
➡ https://chat.whatsapp.com/VOTRE-LIEN-GROUPE

Avec toute notre gratitude,
L’équipe Lap Nomba.
`,
  `<div style="text-align:center; font-family:Arial, sans-serif; color:#333;">
    <img src="https://lapnomba.org/static/media/logo.4f1b14335757132cdcb2.png" 
         alt="LapNomba" 
         style="height:90px; margin-bottom:20px;" />

    <h2 style="color:#222;">Merci ${nom} 🙏</h2>

    <p style="font-size:16px; line-height:1.7;">
      Votre don de <b>${montant} XAF</b> a bien été reçu.<br>
      Grâce à votre soutien, la Fondation <b>Lap Nomba</b> peut poursuivre sa mission :
      <br><b>former, inspirer et autonomiser</b> les jeunes Camerounais à travers le numérique.
    </p>

    <p style="font-size:16px; line-height:1.7;">
      Vous contribuez directement à bâtir un avenir d’innovation, de responsabilité et de solidarité.
    </p>

    <p style="margin-top:25px;">
      <a href="https://chat.whatsapp.com/VOTRE-LIEN-GROUPE"
         style="display:inline-block; padding:12px 24px; background:#25D366;
         color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">
         👉 Rejoindre la communauté Lap Nomba
      </a>
    </p>

    <p style="font-size:14px; color:#666;">
      Ensemble, faisons de la technologie un levier d’espoir et de transformation pour la jeunesse camerounaise.
    </p>

    <small style="color:#999;">
      Ce message est automatique, merci de ne pas répondre directement à cet e-mail.
    </small>
  </div>`
);


      return savedDonateur;
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