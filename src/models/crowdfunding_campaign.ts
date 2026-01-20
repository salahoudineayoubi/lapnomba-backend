import mongoose, { Document, Schema } from "mongoose";

export interface ICrowdfundingCampaign extends Document {
  title: string;
  slug: string; 
  goalAmount: number;
  currency: string;
  story?: string;
  organizerName: string;
  organizerEmail: string;
  coverImage?: string;
  totalRaised: number;
  donorsCount: number;
  status: "ACTIVE" | "PAUSED" | "CLOSED";
  createdAt: Date;
}

const CrowdfundingCampaignSchema = new Schema<ICrowdfundingCampaign>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    goalAmount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "XAF" },
    story: { type: String },
    coverImage: { type: String },
    organizerName: { type: String, required: true, trim: true },
    organizerEmail: { type: String, required: true, trim: true, lowercase: true },
    totalRaised: { type: Number, default: 0 },
    donorsCount: { type: Number, default: 0 },
    status: { type: String, enum: ["ACTIVE", "PAUSED", "CLOSED"], default: "ACTIVE" },
  },
  { timestamps: true }
);

// Index pour accélérer la recherche par slug (utilisé par les donateurs)
CrowdfundingCampaignSchema.index({ slug: 1 });

export const CrowdfundingCampaignModel = mongoose.model<ICrowdfundingCampaign>(
  "CrowdfundingCampaign",
  CrowdfundingCampaignSchema
);