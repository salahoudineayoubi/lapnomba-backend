import Candidature from "../../../../models/candidature";
import { sendStatusEmail } from "./candidature.helpers";

export const refuserCandidature = async (_: any, { id }: { id: string }) => {
  const candidature = await Candidature.findById(id);

  if (candidature) {
    await sendStatusEmail(candidature.email, candidature.nomComplet, 'REFUS');
    // On peut soit supprimer, soit changer le statut en "refusée"
    await Candidature.findByIdAndDelete(id);
  }
  return candidature;
};