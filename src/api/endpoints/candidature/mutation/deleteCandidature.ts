import Candidature from "../../../../models/candidature";
import { sendStatusEmail } from "./candidature.helpers";

export const refuserCandidature = async (_: any, { id }: { id: string }) => {
  const candidature = await Candidature.findById(id);

  if (candidature) {
    await sendStatusEmail(candidature.email, candidature.nomComplet, 'REFUS');
    await Candidature.findByIdAndDelete(id);
  }
  return candidature;
};

export const deleteCandidature = async (_: any, { id }: { id: string }) => {
  const res = await Candidature.findByIdAndDelete(id);
  return !!res;
};