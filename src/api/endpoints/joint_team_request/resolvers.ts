import { AppDataSource } from "../../../data-source";
import { JoinTeamRequest } from "../../../models/join_team_request";
import { sendMail } from "../../../utils/sendMail"; 

const joinTeamRequestRepo = AppDataSource.getRepository(JoinTeamRequest);

export const joinTeamRequestResolvers = {
  Query: {
    joinTeamRequests: async () => joinTeamRequestRepo.find(),
    joinTeamRequest: async (_: any, { id }: { id: number }) =>
      joinTeamRequestRepo.findOne({ where: { id } }),
  },
  Mutation: {
    createJoinTeamRequest: async (
      _: any,
      { nomComplet, email, numeroWhatsapp, message, profession }: any
    ) => {
      const joinRequest = joinTeamRequestRepo.create({
        nomComplet,
        email,
        numeroWhatsapp,
        message,
        profession,
      });
      const savedRequest = await joinTeamRequestRepo.save(joinRequest);


await sendMail(
  email,
  "Confirmation de votre demande",
  `Bonjour ${nomComplet}, votre demande a bien été reçue.`,
  `
  <div style="text-align:center; font-family:Arial, sans-serif; background-color:#f9f9f9; padding:20px; border-radius:10px;">
    <img src="https://lapnomba.org/static/media/logo.4f1b14335757132cdcb2.png" alt="LapNomba" style="height:90px; margin-bottom:10px;" />
    
    <h2 style="color:#333;">Bonjour ${nomComplet},</h2>
    <p style="color:#555; font-size:16px; line-height:1.6;">
      Nous vous remercions pour votre confiance.<br>
      Votre demande a bien été reçue et notre équipe vous contactera très prochainement.<br><br>
      En attendant, rejoignez notre communauté pour rester informé des <b>actualités, formations et actions de la Fondation LapNomba</b>.
    </p>
    
    <a href="https://chat.whatsapp.com/VOTRE-LIEN-WHATSAPP" 
       style="display:inline-block; margin-top:15px; padding:12px 25px; background-color:#25D366; color:white; text-decoration:none; font-weight:bold; border-radius:6px; font-size:16px;">
       💬 Rejoindre la Communauté LapNomba
    </a>

    <p style="margin-top:25px; color:#888; font-size:13px;">
      Ce message est automatique, merci de ne pas y répondre.<br>
      — L’équipe <b>LapNomba</b>
    </p>
  </div>
  `
);

      return savedRequest;
    },

    updateJoinTeamRequest: async (
      _: any,
      { id, ...fields }: any
    ) => {
      const joinRequest = await joinTeamRequestRepo.findOne({ where: { id } });
      if (!joinRequest) throw new Error("Demande non trouvée");
      Object.assign(joinRequest, fields);
      return joinTeamRequestRepo.save(joinRequest);
    },

    deleteJoinTeamRequest: async (_: any, { id }: { id: number }) => {
      const result = await joinTeamRequestRepo.delete(id);
      return result.affected !== 0;
    },
  },
};