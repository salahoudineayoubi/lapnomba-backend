import Candidature from "../../../models/candidature";
import { uploadFromBase64 } from "../../../utils/cloudinary";

export const candidatureResolvers = {
  Query: {
    candidatures: async () => {
      return await Candidature.find().sort({ createdAt: -1 });
    },
    candidature: async (_: any, { id }: { id: string }) => {
      return await Candidature.findById(id);
    },
  },
  Mutation: {
    createCandidature: async (_: any, { input }: any) => {
      try {
        let photoUrl = input.photo;
        // Si la photo est un data URI base64, upload sur Cloudinary
        if (photoUrl && typeof photoUrl === "string" && photoUrl.startsWith("data:")) {
          const uploadRes = await uploadFromBase64(photoUrl, { folder: "candidatures" });
          photoUrl = uploadRes.secure_url;
        }
        const candidature = new Candidature({ ...input, photo: photoUrl });
        await candidature.save();
        return candidature;
      } catch (error: any) {
        if (error.code === 11000 && error.keyPattern?.email) {
          throw new Error("Cet email existe déjà.");
        }
        throw error;
      }
    },
    deleteCandidature: async (_: any, { id }: { id: string }) => {
      const res = await Candidature.findByIdAndDelete(id);
      return !!res;
    },
  },
};