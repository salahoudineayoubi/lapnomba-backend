// models/academyProgram.ts
import { Schema, Document, model, models } from "mongoose";

export type AcademyTrainingMode = "online" | "hybrid" | "onsite" | "custom";

export interface IAcademyProgram extends Document {
  title: string;
  slug: string;
  description: string;
  category: string;

  durationMonths: number;

  onlinePrice: number;
  hybridPrice?: number;
  onsitePrice?: number;

  monthlyPrice: number;
  currency: string;

  availableModes: AcademyTrainingMode[];

  isJobPath: boolean;
  jobPathNote?: string;

  isActive: boolean;
}

const AcademyProgramSchema = new Schema<IAcademyProgram>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    category: { type: String, required: true },

    durationMonths: { type: Number, default: 12 },

    onlinePrice: { type: Number, required: true, default: 500000 },
    hybridPrice: { type: Number, default: 800000 },
    onsitePrice: { type: Number },
    monthlyPrice: { type: Number, required: true, default: 30000 },

    currency: { type: String, default: "XAF" },

    availableModes: {
      type: [String],
      enum: ["online", "hybrid", "onsite", "custom"],
      default: ["online", "hybrid"],
    },

    isJobPath: { type: Boolean, default: true },
    jobPathNote: {
      type: String,
      default:
        "Parcours avec insertion professionnelle progressive via Lap Nomba Enterprise pour les profils validés.",
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.AcademyProgram ||
  model<IAcademyProgram>("AcademyProgram", AcademyProgramSchema);