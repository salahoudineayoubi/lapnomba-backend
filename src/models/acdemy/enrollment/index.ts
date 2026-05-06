// models/academyEnrollment.ts
import { Schema, Document, model, models, Types } from "mongoose";

export type AcademyEnrollmentStatus =
  | "active"
  | "suspendue"
  | "terminee"
  | "abandonnee"
  | "validee";

export type AcademyTalentStatus =
  | "non_eligible"
  | "en_evaluation"
  | "eligible_talent_pool"
  | "transfere_talent_platform";

export interface IAcademyEnrollment extends Document {
  applicationId: Types.ObjectId;
  programId?: Types.ObjectId;

  studentName: string;
  email: string;
  phone: string;
  whatsapp?: string;

  selectedTrack: string;
  trainingMode: "online" | "hybrid" | "onsite" | "custom";

  totalAmount: number;
  monthlyPrice: number;
  currency: string;

  paymentPlan: "monthly" | "full";
  paymentStatus: "en_attente" | "partiel" | "paye" | "retard";

  startDate?: Date;
  endDate?: Date;

  groupId?: Types.ObjectId;

  status: AcademyEnrollmentStatus;

  progressPercent: number;
  completedProjects: number;
  attendanceRate?: number;

  talentStatus: AcademyTalentStatus;
  finalScore?: number;

  adminNote?: string;
}

const AcademyEnrollmentSchema = new Schema<IAcademyEnrollment>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "AcademyApplication",
      required: true,
    },

    programId: { type: Schema.Types.ObjectId, ref: "AcademyProgram" },

    studentName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },

    selectedTrack: { type: String, required: true },
    trainingMode: {
      type: String,
      enum: ["online", "hybrid", "onsite", "custom"],
      required: true,
    },

    totalAmount: { type: Number, required: true },
    monthlyPrice: { type: Number, default: 30000 },
    currency: { type: String, default: "XAF" },

    paymentPlan: {
      type: String,
      enum: ["monthly", "full"],
      default: "monthly",
    },

    paymentStatus: {
      type: String,
      enum: ["en_attente", "partiel", "paye", "retard"],
      default: "en_attente",
    },

    startDate: { type: Date },
    endDate: { type: Date },

    groupId: { type: Schema.Types.ObjectId, ref: "AcademyGroup" },

    status: {
      type: String,
      enum: ["active", "suspendue", "terminee", "abandonnee", "validee"],
      default: "active",
    },

    progressPercent: { type: Number, default: 0 },
    completedProjects: { type: Number, default: 0 },
    attendanceRate: { type: Number },

    talentStatus: {
      type: String,
      enum: [
        "non_eligible",
        "en_evaluation",
        "eligible_talent_pool",
        "transfere_talent_platform",
      ],
      default: "non_eligible",
    },

    finalScore: { type: Number },
    adminNote: { type: String },
  },
  { timestamps: true }
);

AcademyEnrollmentSchema.index({ email: 1, selectedTrack: 1 });
AcademyEnrollmentSchema.index({ status: 1, talentStatus: 1 });
AcademyEnrollmentSchema.index({ groupId: 1 });

export default models.AcademyEnrollment ||
  model<IAcademyEnrollment>("AcademyEnrollment", AcademyEnrollmentSchema);