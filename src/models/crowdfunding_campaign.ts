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
  updatedAt: Date;
}

const CrowdfundingCampaignSchema = new Schema<ICrowdfundingCampaign>(
  {
    title: { type: String, required: true, trim: true },
    // ✅ L'index est créé automatiquement ici grâce à 'unique: true'. 
    // Pas besoin de le redéclarer plus bas.
    slug: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    goalAmount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "XAF" },
    story: { type: String },
    coverImage: { type: String },
    organizerName: { type: String, required: true, trim: true },
    organizerEmail: { type: String, required: true, trim: true, lowercase: true },
    totalRaised: { type: Number, default: 0 },
    donorsCount: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ["ACTIVE", "PAUSED", "CLOSED"], 
      default: "ACTIVE",
      index: true // Utile si vous avez beaucoup de campagnes pour filtrer les actives
    },
  },
  { timestamps: true }
);

/**
 * ❌ SUPPRESSION DE : CrowdfundingCampaignSchema.index({ slug: 1 });
 * C'est cette ligne qui causait le Warning "Duplicate schema index".
 */

// ✅ Sécurité pour éviter de re-compiler le modèle lors du hot-reload en développement
export const CrowdfundingCampaignModel = 
  mongoose.models.CrowdfundingCampaign || 
  mongoose.model<ICrowdfundingCampaign>("CrowdfundingCampaign", CrowdfundingCampaignSchema);