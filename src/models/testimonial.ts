import mongoose, { Document, Schema } from "mongoose";

export type LocalizedText = { fr?: string; en?: string; tr?: string; ar?: string };

const LocalizedTextSchema = new Schema<LocalizedText>(
  {
    fr: { type: String, trim: true },
    en: { type: String, trim: true },
    tr: { type: String, trim: true },
    ar: { type: String, trim: true },
  },
  { _id: false }
);

export interface ITestimonial extends Document {
  /** Format actuel : témoignage écrit avec photo, géré depuis l'admin. */
  nomComplet?: string;
  /** Poste / situation actuelle, ex. « Développeur web full-stack ». */
  poste?: string;
  posteI18n?: LocalizedText;
  avatar?: string;
  temoignage?: string;
  temoignageI18n?: LocalizedText;
  /** Ancien format vidéo — conservé pour les enregistrements existants. */
  titre?: string;
  description?: string;
  video?: string;
  /** Image d'aperçu facultative (affichée avant la lecture). */
  poster?: string;
  /** Traductions facultatives du titre et de la description (fr | en | tr | ar). */
  titreI18n?: LocalizedText;
  descriptionI18n?: LocalizedText;
  createdAt?: Date;
  updatedAt?: Date;
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    nomComplet: { type: String, trim: true },
    poste: { type: String, trim: true },
    posteI18n: { type: LocalizedTextSchema, required: false },
    avatar: { type: String },
    temoignage: { type: String, trim: true },
    temoignageI18n: { type: LocalizedTextSchema, required: false },
    titre: { type: String },
    description: { type: String },
    video: { type: String },
    poster: { type: String, required: false },
    titreI18n: { type: LocalizedTextSchema, required: false },
    descriptionI18n: { type: LocalizedTextSchema, required: false },
  },
  { timestamps: true }
);

export const TestimonialModel = mongoose.model<ITestimonial>("Testimonial", TestimonialSchema);