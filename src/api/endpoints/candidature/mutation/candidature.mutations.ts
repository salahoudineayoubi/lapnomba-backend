import Candidature from "../../../../models/candidature";
import { handleFileUploads, sendStatusEmail } from "./candidature.helpers";

export const createCandidature = async (_: any, { input }: any) => {
  try {
    const { photoUrl, cvUrl } = await handleFileUploads(input);
    const candidature = new Candidature({
      ...input,
      photo: photoUrl,
      cv: cvUrl,
      statut: "en attente" // Statut initial par défaut
    });
    await candidature.save();
    await sendStatusEmail(candidature.email, candidature.nomComplet, 'CONFIRMATION');
    return candidature;
  } catch (error: any) {
    if (error.code === 11000) throw new Error("Cet email est déjà enregistré.");
    throw error;
  }
};

export const approuverCandidature = async (_: any, { id }: { id: string }) => {
  const candidature = await Candidature.findByIdAndUpdate(
    id, { statut: "approuvée" }, { new: true }
  );
  if (candidature) await sendStatusEmail(candidature.email, candidature.nomComplet, 'APPROBATION');
  return candidature;
};

export const refuserCandidature = async (_: any, { id }: { id: string }) => {
  const candidature = await Candidature.findByIdAndUpdate(
    id, { statut: "refusée" }, { new: true }
  );
  if (candidature) await sendStatusEmail(candidature.email, candidature.nomComplet, 'REFUS');
  return candidature;
};

export const deleteCandidature = async (_: any, { id }: { id: string }) => {
  const res = await Candidature.findByIdAndDelete(id);
  return !!res;
};