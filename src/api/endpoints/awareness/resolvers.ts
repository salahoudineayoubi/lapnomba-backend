import AwarenessAgent from "../../../models/awarenessAgent";
import { sendMail } from "../../../utils/sendMail";

export const awarenessResolvers = {
  Query: {
    awarenessAgents: async () => 
      await AwarenessAgent.find().sort({ createdAt: -1 }),
  },
  Mutation: {
    createAwarenessAgent: async (_: any, { input }: any) => {
      try {
        const agent = await AwarenessAgent.create(input);

        await sendMail(
          agent.email,
          "Engagement Terrain - Fondation Lap Nomba",
          `Bonjour ${agent.nomComplet},\n\nVotre candidature comme Agent de Sensibilisation a été reçue. Nous préparons votre kit d'intervention pour la zone : ${agent.zoneIntervention}.`
        );

        return agent;
      } catch (error: any) {
        if (error.code === 11000) throw new Error("Cet email est déjà utilisé.");
        throw error;
      }
    },
    updateAwarenessAgentStatus: async (_: any, { id, statut }: any) => {
      return await AwarenessAgent.findByIdAndUpdate(id, { statut }, { new: true });
    }
  }
};