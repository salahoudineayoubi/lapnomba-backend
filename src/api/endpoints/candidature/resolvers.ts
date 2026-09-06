import * as CandidatureQueries from "./mutation/candidature.queries";
import * as CandidatureMutations from "./mutation/candidature.mutations";
import { calculateAgeFromString } from "../../../utils/ageEligibility";

export const candidatureResolvers = {
  Candidature: {
    // Recalculé à chaque requête depuis dateNaissance — jamais persisté.
    age: (parent: any) => {
      try {
        return calculateAgeFromString(parent.dateNaissance);
      } catch {
        return null;
      }
    },
  },

  Query: {
    candidatures: CandidatureQueries.candidatures,
    candidaturesPaginated: CandidatureQueries.candidaturesPaginated,
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