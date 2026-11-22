import mongoose, { Document, Schema } from "mongoose";
import { LocalizedText } from "./testimonial";

const LocalizedTextSchema = new Schema<LocalizedText>(
  {
    fr: { type: String, trim: true },
    en: { type: String, trim: true },
    tr: { type: String, trim: true },
    ar: { type: String, trim: true },
  },
  { _id: false }
);

/**
 * Membre de l'équipe dirigeante (« Nos leaders » sur lapnomba.org/leaders),
 * entièrement géré depuis l'admin. Les langues absentes sont affichées en
 * français par le site (le backend stocke ce que l'admin saisit).
 */
export interface ILeader extends Document {
  name: string;
  /** Identifiant d'URL : /leaders/<slug>. Unique, minuscules, chiffres et tirets. */
  slug: string;
  title: LocalizedText;
  bio?: LocalizedText;
  /** URL publique Cloudinary de la photo. */
  avatar?: string;
  /** public_id Cloudinary, pour supprimer l'image avec la fiche. */
  avatarPublicId?: string;
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const LeaderSchema = new Schema<ILeader>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: LocalizedTextSchema, required: true },
    bio: { type: LocalizedTextSchema, required: false },
    avatar: { type: String },
    avatarPublicId: { type: String },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const LeaderModel = mongoose.model<ILeader>("Leader", LeaderSchema);
