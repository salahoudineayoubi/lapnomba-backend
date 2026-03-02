import mongoose, { Document, Schema } from "mongoose";

export type MaterialDeliveryMode = "DROP_OFF" | "PICKUP" | "SHIPPING";
export type MaterialCondition = "NEW" | "VERY_GOOD" | "GOOD" | "REPAIRABLE";

export interface IMaterialDonation extends Document {
  donorName: string;
  donorPhone: string;
  donorEmail?: string;

  itemType: string;
  condition: MaterialCondition;
  quantity: number;

  deliveryMode: MaterialDeliveryMode;
  pickupAddress?: string;
  notes?: string;

  status: "RECEIVED" | "SCHEDULED" | "PENDING";
  createdAt: Date;
  updatedAt: Date;
}

const MaterialDonationSchema = new Schema<IMaterialDonation>(
  {
    donorName: { type: String, required: true, trim: true },
    donorPhone: { type: String, required: true, trim: true },
    donorEmail: { type: String, trim: true, lowercase: true },

    itemType: { type: String, required: true, trim: true },
    condition: { type: String, enum: ["NEW", "VERY_GOOD", "GOOD", "REPAIRABLE"], required: true },
    quantity: { type: Number, required: true, min: 1 },

    deliveryMode: { type: String, enum: ["DROP_OFF", "PICKUP", "SHIPPING"], required: true },
    pickupAddress: { type: String },
    notes: { type: String },

    status: { type: String, enum: ["RECEIVED", "SCHEDULED", "PENDING"], default: "PENDING" },
  },
  { timestamps: true }
);

export const MaterialDonationModel = mongoose.model<IMaterialDonation>(
  "MaterialDonation",
  MaterialDonationSchema
);