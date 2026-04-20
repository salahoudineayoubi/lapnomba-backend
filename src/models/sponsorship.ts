import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISponsorship extends Document {
  sponsorName: string;
  sponsorEmail?: string;
  sponsorPhone?: string;

  studentName?: string;
  amount?: number;
  currency?: string;
  message?: string;

  status: string;

  createdAt: Date;
  updatedAt: Date;
}

const SponsorshipSchema = new Schema<ISponsorship>(
  {
    sponsorName: {
      type: String,
      required: true,
      trim: true,
    },

    sponsorEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    sponsorPhone: {
      type: String,
      trim: true,
    },

    studentName: {
      type: String,
      trim: true,
    },

    amount: {
      type: Number,
      min: 0,
    },

    currency: {
      type: String,
      default: "XAF",
      uppercase: true,
      trim: true,
    },

    message: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      required: true,
      default: "PENDING",
      enum: ["PENDING", "ACTIVE", "COMPLETED", "CANCELED"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

SponsorshipSchema.index({ createdAt: -1 });
SponsorshipSchema.index({ status: 1, createdAt: -1 });

SponsorshipSchema.pre("validate", function (next) {
  const doc = this as ISponsorship;

  if (!doc.sponsorName?.trim()) {
    return next(new Error("Le nom du sponsor est requis."));
  }

  if (doc.amount !== undefined && doc.amount < 0) {
    return next(new Error("Le montant du sponsoring ne peut pas être négatif."));
  }

  next();
});

const SponsorshipModelInstance: Model<ISponsorship> =
  (mongoose.models.Sponsorship as Model<ISponsorship>) ||
  mongoose.model<ISponsorship>("Sponsorship", SponsorshipSchema);

export const SponsorshipModel = SponsorshipModelInstance;