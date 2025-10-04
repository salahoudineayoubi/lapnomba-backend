import { AppDataSource } from "../../../data-source";
import { JoinTeamRequest } from "../../../models/join_team_request";

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
      return joinTeamRequestRepo.save(joinRequest);
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