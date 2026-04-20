import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMaterialDonation extends Document {
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;

  itemType: string;
  quantity: number;
  description?: string;

  status: string;

  createdAt: Date;
  updatedAt: Date;
}

const MaterialDonationSchema = new Schema<IMaterialDonation>(
  {
    donorName: {
      type: String,
      required: true,
      trim: true,
    },

    donorEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    donorPhone: {
      type: String,
      trim: true,
    },

    itemType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    description: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      required: true,
      default: "PENDING",
      enum: ["PENDING", "REVIEWED", "ACCEPTED", "REJECTED", "RECEIVED"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

MaterialDonationSchema.index({ createdAt: -1 });
MaterialDonationSchema.index({ status: 1, createdAt: -1 });

MaterialDonationSchema.pre("validate", function (next) {
  const doc = this as IMaterialDonation;

  if (!doc.donorName?.trim()) {
    return next(new Error("Le nom du donateur est requis."));
  }

  if (!doc.itemType?.trim()) {
    return next(new Error("Le type de matériel est requis."));
  }

  if (doc.quantity <= 0) {
    return next(new Error("La quantité doit être supérieure à 0."));
  }

  next();
});

const MaterialDonationModelInstance: Model<IMaterialDonation> =
  (mongoose.models.MaterialDonation as Model<IMaterialDonation>) ||
  mongoose.model<IMaterialDonation>("MaterialDonation", MaterialDonationSchema);

export const MaterialDonationModel = MaterialDonationModelInstance;