import mongoose, { Document, Model, Schema } from "mongoose";

export const TALENT_ROLES = [
  "web_mobile",
  "data_ai",
  "cybersecurity",
  "cloud_devops",
  "design",
  "digital_marketing",
  "project_management",
  "other",
] as const;
export const TALENT_SENIORITIES = ["junior", "intermediate", "senior", "mixed"] as const;
export const TALENT_ENGAGEMENTS = ["full_time", "part_time", "project"] as const;
export const TALENT_REQUEST_STATUSES = ["NEW", "CONTACTED", "IN_PROGRESS", "WON", "CLOSED"] as const;

/** Demande d'une entreprise qui veut recruter des talents (talents.lapnomba.org). */
export interface ITalentRequest extends Document {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  country?: string;
  roles: string[];
  seniority?: string;
  teamSize?: number;
  engagement?: string;
  startDate?: string;
  message?: string;
  language?: string;
  profileSlug?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const TalentRequestSchema = new Schema<ITalentRequest>(
  {
    companyName: { type: String, required: true, trim: true, maxlength: 150 },
    contactName: { type: String, required: true, trim: true, maxlength: 150 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 40 },
    country: { type: String, trim: true, maxlength: 100 },
    roles: { type: [String], enum: TALENT_ROLES, default: [] },
    seniority: { type: String, enum: TALENT_SENIORITIES },
    teamSize: { type: Number, min: 1, max: 500 },
    engagement: { type: String, enum: TALENT_ENGAGEMENTS },
    startDate: { type: String, trim: true, maxlength: 60 },
    message: { type: String, trim: true, maxlength: 3000 },
    language: { type: String, trim: true, maxlength: 5 },
    profileSlug: { type: String, trim: true, lowercase: true, maxlength: 80 },
    status: { type: String, enum: TALENT_REQUEST_STATUSES, default: "NEW", index: true },
  },
  { timestamps: true }
);

TalentRequestSchema.index({ createdAt: -1 });

export const TalentRequestModel: Model<ITalentRequest> =
  (mongoose.models.TalentRequest as Model<ITalentRequest>) ||
  mongoose.model<ITalentRequest>("TalentRequest", TalentRequestSchema);
