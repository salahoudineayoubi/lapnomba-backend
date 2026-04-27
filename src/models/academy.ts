// models/academyApplication.ts
import { Schema, Document, model, models } from "mongoose";

export type AcademyApplicantType =
  | "professionnel"
  | "entreprise"
  | "ong"
  | "diaspora";

export type AcademyPaymentStatus =
  | "non_requis"
  | "en_attente"
  | "partiel"
  | "paye"
  | "echoue"
  | "rembourse";

export type AcademyApplicationStatus =
  | "nouvelle"
  | "en_etude"
  | "devis_envoye"
  | "approuvee"
  | "refusee"
  | "inscrite"
  | "terminee";

export interface IAcademyApplication extends Document {
  applicantType: AcademyApplicantType;

  // Contact principal
  fullName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  country: string;
  city?: string;

  // Organisation si entreprise / ONG
  organizationName?: string;
  organizationType?: string;
  position?: string;
  website?: string;

  // Formation
  selectedTrack: string;
  trainingMode: "online" | "onsite" | "hybrid";
  numberOfParticipants?: number;
  preferredStartDate?: string;
  learningGoal: string;
  currentLevel?: string;

  // Paiement / devis
  requiresQuote: boolean;
  estimatedBudget?: string;
  paymentMethod?: string;
  paymentStatus: AcademyPaymentStatus;
  amount?: number;
  currency?: string;
  invoiceUrl?: string;
  quoteUrl?: string;

  // Impact
  understandsImpactModel: boolean;
  impactNote?: string;

  // Admin
  status: AcademyApplicationStatus;
  adminNote?: string;
}

const AcademyApplicationSchema = new Schema<IAcademyApplication>(
  {
    applicantType: {
      type: String,
      enum: ["professionnel", "entreprise", "ong", "diaspora"],
      required: true,
    },

    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    country: { type: String, required: true, trim: true },
    city: { type: String, trim: true },

    organizationName: { type: String, trim: true },
    organizationType: { type: String, trim: true },
    position: { type: String, trim: true },
    website: { type: String, trim: true },

    selectedTrack: { type: String, required: true, trim: true },
    trainingMode: {
      type: String,
      enum: ["online", "onsite", "hybrid"],
      default: "online",
      required: true,
    },
    numberOfParticipants: { type: Number, default: 1 },
    preferredStartDate: { type: String },
    learningGoal: { type: String, required: true },
    currentLevel: { type: String },

    requiresQuote: { type: Boolean, default: false },
    estimatedBudget: { type: String },
    paymentMethod: { type: String },
    paymentStatus: {
      type: String,
      enum: ["non_requis", "en_attente", "partiel", "paye", "echoue", "rembourse"],
      default: "en_attente",
    },
    amount: { type: Number },
    currency: { type: String, default: "XAF" },
    invoiceUrl: { type: String },
    quoteUrl: { type: String },

    understandsImpactModel: { type: Boolean, default: true },
    impactNote: {
      type: String,
      default:
        "Chaque formation premium contribue au financement des formations gratuites des jeunes talents africains.",
    },

    status: {
      type: String,
      enum: [
        "nouvelle",
        "en_etude",
        "devis_envoye",
        "approuvee",
        "refusee",
        "inscrite",
        "terminee",
      ],
      default: "nouvelle",
      required: true,
    },
    adminNote: { type: String },
  },
  { timestamps: true }
);

AcademyApplicationSchema.index({ email: 1, selectedTrack: 1 }, { unique: false });
AcademyApplicationSchema.index({ applicantType: 1, status: 1 });

export default models.AcademyApplication ||
  model<IAcademyApplication>("AcademyApplication", AcademyApplicationSchema);