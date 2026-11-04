import mongoose, { Document, Schema } from "mongoose";
import { transformPlugin } from "./plugins/transform.plugin";

export const MENTOR_DOMAINS = ["DEVOPS_CLOUD", "DATA", "AI", "CYBERSECURITY", "WEB_MOBILE", "UX_UI"] as const;
export const MENTOR_STATUSES = ["PENDING", "ACCEPTED", "REJECTED"] as const;

export interface IMentorApplication extends Document {
  fullName: string;
  email: string;
  phone: string;
  domain: (typeof MENTOR_DOMAINS)[number];
  yearsExperience: number;
  linkedinUrl?: string;
  motivation: string;
  hoursPerMonth: number;
  status: (typeof MENTOR_STATUSES)[number];
  createdAt: Date;
  updatedAt: Date;
}

/** Candidature d'un mentor / formateur bénévole (axe « Former »). */
const MentorApplicationSchema = new Schema<IMentorApplication>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true },
    domain: { type: String, required: true, enum: MENTOR_DOMAINS },
    yearsExperience: { type: Number, required: true, min: 0, max: 60 },
    linkedinUrl: { type: String, trim: true },
    motivation: { type: String, required: true, trim: true },
    hoursPerMonth: { type: Number, required: true, min: 1, max: 200 },
    status: { type: String, required: true, enum: MENTOR_STATUSES, default: "PENDING", index: true },
  },
  { timestamps: true }
);

MentorApplicationSchema.plugin(transformPlugin);

export default (mongoose.models.MentorApplication as mongoose.Model<IMentorApplication>) ||
  mongoose.model<IMentorApplication>("MentorApplication", MentorApplicationSchema);
