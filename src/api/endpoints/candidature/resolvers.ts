import * as CandidatureQueries from "./mutation/candidature.queries";
import * as CandidatureMutations from "./mutation/candidature.mutations";

export const candidatureResolvers = {
  Query: {
    candidatures: CandidatureQueries.candidatures,
    candidatureById: CandidatureQueries.candidatureById,

    // 🔥 AJOUT IMPORTANT (dashboard stats ONG)
    candidatureStats: CandidatureQueries.candidatureStats,
  },

  Mutation: {
    createCandidature: CandidatureMutations.createCandidature,
    approuverCandidature: CandidatureMutations.approuverCandidature,
    refuserCandidature: CandidatureMutations.refuserCandidature,
    deleteCandidature: CandidatureMutations.deleteCandidature,
  },
};