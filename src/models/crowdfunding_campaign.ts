import mongoose, { Document, Model, Schema } from "mongoose";

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
  status: string;

  createdAt: Date;
  updatedAt: Date;
}

const CrowdfundingCampaignSchema = new Schema<ICrowdfundingCampaign>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    goalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      default: "XAF",
      uppercase: true,
      trim: true,
    },

    story: {
      type: String,
      trim: true,
    },

    organizerName: {
      type: String,
      required: true,
      trim: true,
    },

    organizerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    coverImage: {
      type: String,
      trim: true,
    },

    totalRaised: {
      type: Number,
      default: 0,
      min: 0,
    },

    donorsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      required: true,
      default: "ACTIVE",
      enum: ["ACTIVE", "PAUSED", "CLOSED", "ARCHIVED"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CrowdfundingCampaignSchema.index({ createdAt: -1 });
CrowdfundingCampaignSchema.index({ status: 1, createdAt: -1 });
CrowdfundingCampaignSchema.index({ slug: 1 }, { unique: true });

CrowdfundingCampaignSchema.pre("validate", function (next) {
  const doc = this as ICrowdfundingCampaign;

  if (!doc.title?.trim()) {
    return next(new Error("Le titre de la campagne est requis."));
  }

  if (!doc.slug?.trim()) {
    return next(new Error("Le slug de la campagne est requis."));
  }

  if (!doc.organizerName?.trim()) {
    return next(new Error("Le nom de l'organisateur est requis."));
  }

  if (!doc.organizerEmail?.includes("@")) {
    return next(new Error("Un email valide est requis pour l'organisateur."));
  }

  if (doc.goalAmount <= 0) {
    return next(new Error("Le montant cible doit être supérieur à 0."));
  }

  next();
});

const CrowdfundingCampaignModelInstance: Model<ICrowdfundingCampaign> =
  (mongoose.models.CrowdfundingCampaign as Model<ICrowdfundingCampaign>) ||
  mongoose.model<ICrowdfundingCampaign>(
    "CrowdfundingCampaign",
    CrowdfundingCampaignSchema
  );

export const CrowdfundingCampaignModel = CrowdfundingCampaignModelInstance;