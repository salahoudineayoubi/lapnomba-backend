import * as CandidatureQueries from "./mutation/candidature.queries";
import * as CandidatureMutations from "./mutation/candidature.mutations";

export const candidatureResolvers = {
  Query: {
    candidatures: CandidatureQueries.candidatures,
    candidatureById: CandidatureQueries.candidatureById, // Doit être identique au nom dans TypeDefs
  },
  Mutation: {
    createCandidature: CandidatureMutations.createCandidature,
    approuverCandidature: CandidatureMutations.approuverCandidature,
    refuserCandidature: CandidatureMutations.refuserCandidature,
    deleteCandidature: CandidatureMutations.deleteCandidature,
  }
};