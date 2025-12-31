
import { createCandidature } from "./mutation/createCandidature";
import { approuverCandidature } from "./mutation/approveCandidature";
import { refuserCandidature } from "./mutation/refuseCandidature";
import { deleteCandidature } from "./mutation/deleteCandidature";
import Candidature from "../../../models/candidature";

export const candidatureResolvers = {
  Query: {
    candidatures: async () => await Candidature.find().sort({ createdAt: -1 }),
    candidature: async (_: any, { id }: any) => await Candidature.findById(id),
  },
  Mutation: {
    createCandidature,
    approuverCandidature,
    refuserCandidature,
    deleteCandidature
  }
};