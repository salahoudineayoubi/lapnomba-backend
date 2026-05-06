// models/academyApplication.ts
import { Schema, Document, model, models, Types } from "mongoose";

export type AcademyApplicantType =
  | "professionnel"
  | "entreprise"
  | "ong"
  | "diaspora";

export type AcademyTrainingMode = "online" | "hybrid" | "onsite" | "custom";

export type AcademyApplicationStatus =
  | "nouvelle"
  | "en_etude"
  | "devis_envoye"
  | "approuvee"
  | "refusee"
  | "convertie_en_inscription";

export interface IAcademyApplication extends Document {
  applicantType: AcademyApplicantType;

  fullName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  country: string;
  city?: string;

  organizationName?: string;
  organizationType?: string;
  position?: string;
  website?: string;

  programId?: Types.ObjectId;
  selectedTrack: string;
  trainingMode: AcademyTrainingMode;

  numberOfParticipants: number;
  preferredStartDate?: string;
  learningGoal: string;
  currentLevel?: string;

  requiresQuote: boolean;
  estimatedBudget?: string;
  quoteUrl?: string;

  expectedAmount?: number;
  monthlyPrice?: number;
  currency: string;

  understandsImpactModel: boolean;
  impactNote?: string;

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

    programId: { type: Schema.Types.ObjectId, ref: "AcademyProgram" },
    selectedTrack: { type: String, required: true, trim: true },

    trainingMode: {
      type: String,
      enum: ["online", "hybrid", "onsite", "custom"],
      default: "online",
      required: true,
    },

    numberOfParticipants: { type: Number, default: 1 },
    preferredStartDate: { type: String },
    learningGoal: { type: String, required: true },
    currentLevel: { type: String },

    requiresQuote: { type: Boolean, default: false },
    estimatedBudget: { type: String },
    quoteUrl: { type: String },

    expectedAmount: { type: Number },
    monthlyPrice: { type: Number, default: 30000 },
    currency: { type: String, default: "XAF" },

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
        "convertie_en_inscription",
      ],
      default: "nouvelle",
    },

    adminNote: { type: String },
  },
  { timestamps: true }
);

AcademyApplicationSchema.index({ email: 1 });
AcademyApplicationSchema.index({ applicantType: 1, status: 1 });
AcademyApplicationSchema.index({ selectedTrack: 1, trainingMode: 1 });

export default models.AcademyApplication ||
  model<IAcademyApplication>("AcademyApplication", AcademyApplicationSchema);