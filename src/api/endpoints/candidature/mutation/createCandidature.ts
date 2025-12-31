import Candidature from "../../../../models/candidature";
import { handleFileUploads, sendStatusEmail } from "./candidature.helpers";

export const createCandidature = async (_: any, { input }: any) => {
  try {
    const { photoUrl, cvUrl } = await handleFileUploads(input);

    const candidature = new Candidature({
      ...input,
      photo: photoUrl,
      cv: cvUrl,
      statut: "en attente"
    });

    await candidature.save();
    await sendStatusEmail(candidature.email, candidature.nomComplet, 'CONFIRMATION');
    
    return candidature;
  } catch (error: any) {
    if (error.code === 11000) throw new Error("Cet email est déjà enregistré.");
    throw error;
  }
};