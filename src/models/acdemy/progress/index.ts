// models/academyProgress.ts
import { Schema, Document, model, models, Types } from "mongoose";

export interface IAcademyProgress extends Document {
  enrollmentId: Types.ObjectId;

  progressPercent: number;
  completedModules: number;
  completedProjects: number;

  attendanceRate?: number;

  technicalScore?: number;
  softSkillScore?: number;
  finalScore?: number;

  portfolioUrl?: string;
  githubUrl?: string;
  cvUrl?: string;

  validatedByAdmin: boolean;
  validatedAt?: Date;

  readyForTalentPlatform: boolean;
  transferredToTalentPlatform: boolean;

  note?: string;
}

const AcademyProgressSchema = new Schema<IAcademyProgress>(
  {
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: "AcademyEnrollment",
      required: true,
      unique: true,
    },

    progressPercent: { type: Number, default: 0 },
    completedModules: { type: Number, default: 0 },
    completedProjects: { type: Number, default: 0 },

    attendanceRate: { type: Number },

    technicalScore: { type: Number },
    softSkillScore: { type: Number },
    finalScore: { type: Number },

    portfolioUrl: { type: String },
    githubUrl: { type: String },
    cvUrl: { type: String },

    validatedByAdmin: { type: Boolean, default: false },
    validatedAt: { type: Date },

    readyForTalentPlatform: { type: Boolean, default: false },
    transferredToTalentPlatform: { type: Boolean, default: false },

    note: { type: String },
  },
  { timestamps: true }
);

AcademyProgressSchema.index({ readyForTalentPlatform: 1 });
AcademyProgressSchema.index({ transferredToTalentPlatform: 1 });

export default models.AcademyProgress ||
  model<IAcademyProgress>("AcademyProgress", AcademyProgressSchema);