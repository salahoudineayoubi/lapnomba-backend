import mongoose, { Document, Model, Schema } from "mongoose";
import { LocalizedText } from "./testimonial";
import { TALENT_ENGAGEMENTS, TALENT_ROLES, TALENT_SENIORITIES } from "./talent_request";

const LocalizedTextSchema = new Schema<LocalizedText>(
  {
    fr: { type: String, trim: true },
    en: { type: String, trim: true },
    tr: { type: String, trim: true },
    ar: { type: String, trim: true },
  },
  { _id: false }
);

export const TALENT_AVAILABILITIES = ["available", "soon", "unavailable"] as const;

/**
 * Profil d'un talent formé par Lap Nomba, saisi depuis le back office et
 * affiché sur talents.lapnomba.org (vitrine type Andela).
 * Champs PUBLICS : displayName, photo, headline, bio, compétences, niveau…
 * Champs INTERNES (admin uniquement) : fullName, email, phone, links privés, notes.
 * Publication impossible sans consentement de la personne (consentObtained).
 */
export interface ITalentProfile extends Document {
  slug: string;
  displayName: string;
  fullName?: string;
  email?: string;
  phone?: string;
  photo?: string;
  headline: string;
  headlineI18n?: LocalizedText;
  bio?: string;
  bioI18n?: LocalizedText;
  expertise: string;
  skills: string[];
  seniority?: string;
  yearsExperience?: number;
  city?: string;
  country?: string;
  availability: string;
  engagements: string[];
  spokenLanguages: string[];
  trainingProgram?: string;
  vetting: { training: boolean; projects: boolean; technicalAssessment: boolean; softSkills: boolean };
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  notes?: string;
  consentObtained: boolean;
  published: boolean;
  featured: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const TalentProfileSchema = new Schema<ITalentProfile>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    fullName: { type: String, trim: true, maxlength: 150 },
    email: { type: String, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 40 },
    photo: { type: String, trim: true },
    headline: { type: String, required: true, trim: true, maxlength: 120 },
    headlineI18n: { type: LocalizedTextSchema, required: false },
    bio: { type: String, trim: true, maxlength: 1500 },
    bioI18n: { type: LocalizedTextSchema, required: false },
    expertise: { type: String, enum: TALENT_ROLES, required: true, index: true },
    skills: { type: [String], default: [] },
    seniority: { type: String, enum: TALENT_SENIORITIES },
    yearsExperience: { type: Number, min: 0, max: 50 },
    city: { type: String, trim: true, maxlength: 80 },
    country: { type: String, trim: true, maxlength: 80 },
    availability: { type: String, enum: TALENT_AVAILABILITIES, default: "available" },
    engagements: { type: [String], enum: TALENT_ENGAGEMENTS, default: [] },
    spokenLanguages: { type: [String], default: [] },
    trainingProgram: { type: String, trim: true, maxlength: 120 },
    vetting: {
      training: { type: Boolean, default: true },
      projects: { type: Boolean, default: false },
      technicalAssessment: { type: Boolean, default: false },
      softSkills: { type: Boolean, default: false },
    },
    portfolioUrl: { type: String, trim: true, maxlength: 300 },
    githubUrl: { type: String, trim: true, maxlength: 300 },
    linkedinUrl: { type: String, trim: true, maxlength: 300 },
    notes: { type: String, trim: true, maxlength: 3000 },
    consentObtained: { type: Boolean, default: false },
    published: { type: Boolean, default: false, index: true },
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TalentProfileSchema.index({ published: 1, featured: -1, order: 1, createdAt: -1 });

export const TalentProfileModel: Model<ITalentProfile> =
  (mongoose.models.TalentProfile as Model<ITalentProfile>) ||
  mongoose.model<ITalentProfile>("TalentProfile", TalentProfileSchema);
