import mongoose, { Document, Schema } from "mongoose";

/**
 * Document singleton (un seul enregistrement dans la collection) — les deux
 * vidéos "histoire de la fondation" (FR/EN) affichées sur la page d'accueil,
 * gérées depuis l'admin. Hébergées en fichiers statiques sur le serveur
 * backend (DigitalOcean), plus de vidéo embarquée dans le bundle frontend.
 */
export interface IFounderHistoryVideo extends Document {
  videoFr?: string;
  videoEn?: string;
  updatedAt?: Date;
}

const FounderHistoryVideoSchema = new Schema<IFounderHistoryVideo>(
  {
    videoFr: { type: String },
    videoEn: { type: String },
  },
  { timestamps: true }
);

export const FounderHistoryVideoModel = mongoose.model<IFounderHistoryVideo>(
  "FounderHistoryVideo",
  FounderHistoryVideoSchema
);

/**
 * Il n'existe jamais qu'un seul document dans cette collection — ces deux
 * helpers évitent de dupliquer la logique "lire/créer le singleton" ailleurs.
 */
export const getFounderHistoryVideo = async () => {
  return await FounderHistoryVideoModel.findOne();
};

export const upsertFounderHistoryVideo = async (update: Partial<IFounderHistoryVideo>) => {
  return await FounderHistoryVideoModel.findOneAndUpdate({}, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
};
