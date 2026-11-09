import mongoose, { Document, Schema } from "mongoose";

export interface ICommunityVoice extends Document {
  name: string;
  email?: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  /** Langue d'origine du commentaire (fr | en | tr | ar), facultative. */
  language?: string;
  /** Traductions du commentaire saisies par l'équipe depuis l'admin. */
  commentI18n?: { fr?: string; en?: string; tr?: string; ar?: string };
  createdAt: Date;
  updatedAt: Date;
}

const CommunityVoiceSchema = new Schema<ICommunityVoice>(
  {
    name: { type: String, required: true },
    email: { type: String, required: false },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    isApproved: { type: Boolean, default: false },
    language: { type: String, enum: ["fr", "en", "tr", "ar"], required: false },
    commentI18n: {
      fr: { type: String, trim: true },
      en: { type: String, trim: true },
      tr: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

export const CommunityVoiceModel = mongoose.model<ICommunityVoice>(
  "CommunityVoice",
  CommunityVoiceSchema
);