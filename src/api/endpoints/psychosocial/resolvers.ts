import Psychosocial from "../../../models/psychosocial";
import { sendMail } from "../../../utils/sendMail";

export const psychosocialResolvers = {
  Query: {
    psychosocials: async () => await Psychosocial.find().sort({ createdAt: -1 }),
  },
  Mutation: {
    createPsychosocial: async (_: any, { input }: any) => {
      const res = await Psychosocial.create(input);
      // Email de confirmation
      await sendMail(
        res.email, 
        "Engagement Psychosocial - Fondation Lap Nomba", 
        `Bonjour ${res.nomComplet}, votre candidature pour accompagner nos jeunes a été bien reçue. Merci pour votre humanité.`
      );
      return res;
    },
    updatePsychosocialStatus: async (_: any, { id, statut }: any) => {
        const res = await Psychosocial.findByIdAndUpdate(id, { statut }, { new: true });
        if (res && res.email && res.nomComplet) {
          if (statut === "approuvée") {
            await sendMail(
              res.email,
              "Approbation Engagement Psychosocial - Fondation Lap Nomba",
              `Bonjour ${res.nomComplet},

Félicitations, votre engagement psychosocial a été approuvé ! Vous allez prochainement recevoir les instructions pour rejoindre notre équipe d'accompagnement.

Merci de contribuer à l'impact social de la Fondation Lap Nomba.`
            );
          } else if (statut === "refusée") {
            await sendMail(
              res.email,
              "Décision Engagement Psychosocial - Fondation Lap Nomba",
              `Bonjour ${res.nomComplet},

Après étude de votre candidature, nous sommes au regret de vous informer qu'elle n'a pas été retenue pour cette session.

Nous vous remercions pour votre intérêt et votre volonté d'accompagner la jeunesse avec la Fondation Lap Nomba.`
            );
          }
        }
        return res;
    }
  }
};