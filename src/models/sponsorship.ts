import mongoose, { Document, Schema } from "mongoose";

export type SponsorshipDuration = "3M" | "6M" | "12M";
export type SponsorshipStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELED";

export interface ISponsorship extends Document {
  sponsorName: string;
  sponsorEmail: string;
  sponsorPhone?: string;

  studentName?: string;   // optionnel si tu assignes plus tard
  studentId?: string;     // si tu as une table Students
  duration: SponsorshipDuration;

  monthlyReport: boolean; // suivi mensuel
  status: SponsorshipStatus;

  createdAt: Date;
  updatedAt: Date;
}

const SponsorshipSchema = new Schema<ISponsorship>(
  {
    sponsorName: { type: String, required: true, trim: true },
    sponsorEmail: { type: String, required: true, trim: true, lowercase: true },
    sponsorPhone: { type: String },

    studentName: { type: String },
    studentId: { type: String },

    duration: { type: String, enum: ["3M", "6M", "12M"], required: true },
    monthlyReport: { type: Boolean, default: true },
    status: { type: String, enum: ["ACTIVE","PAUSED","COMPLETED","CANCELED"], default: "ACTIVE" },
  },
  { timestamps: true }
);

export const SponsorshipModel = mongoose.model<ISponsorship>("Sponsorship", SponsorshipSchema);
