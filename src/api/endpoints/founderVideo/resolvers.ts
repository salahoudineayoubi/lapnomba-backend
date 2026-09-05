import { getFounderHistoryVideo } from "../../../models/founderHistoryVideo";

export const founderVideoResolvers = {
  Query: {
    founderHistoryVideo: async () => {
      const doc = await getFounderHistoryVideo();
      if (!doc) return null;

      return {
        videoFr: doc.videoFr || null,
        videoEn: doc.videoEn || null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
      };
    },
  },
};
