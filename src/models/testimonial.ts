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
  titre: string;
  description: string;
  video: string;
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
    titre: { type: String, required: true },
    description: { type: String, required: true },
    video: { type: String, required: true },
    poster: { type: String, required: false },
    titreI18n: { type: LocalizedTextSchema, required: false },
    descriptionI18n: { type: LocalizedTextSchema, required: false },
  },
  { timestamps: true }
);

export const TestimonialModel = mongoose.model<ITestimonial>("Testimonial", TestimonialSchema);