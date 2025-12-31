import Candidature from "../../../../models/candidature";
import { sendStatusEmail } from "./candidature.helpers";

export const approuverCandidature = async (_: any, { id }: { id: string }) => {
  const candidature = await Candidature.findByIdAndUpdate(
    id,
    { statut: "approuvée" },
    { new: true }
  );

  if (candidature) {
    await sendStatusEmail(candidature.email, candidature.nomComplet, 'APPROBATION');
  }
  return candidature;
};