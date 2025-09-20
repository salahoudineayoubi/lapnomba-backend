import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IForwarder extends Document {
  userId: Types.ObjectId;
  companyName: string;
  city: string;
  address: string;
  postalCode: string;
  phone: {
    value: string;
    dialCode: string;
    countryCode: string;
  };
  licenseNumber?: string;
  region?: string;
  taxDocument?: string;
  activitiesDocument?: string;
  status?: "pending" | "verified" | "rejected"; // <-- Ajouté
}

const ForwarderSchema = new Schema<IForwarder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    companyName: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, required: true },
    postalCode: { type: String, required: true },
    phone: {
      type: new Schema(
        {
          value: { type: String, required: true },
          dialCode: { type: String, required: true },
          countryCode: { type: String, required: true }
        },
        { _id: false }
      ),
      required: true
    },
    licenseNumber: { type: String },
    region: { type: String },
    taxDocument: { type: String },
    activitiesDocument: { type: String },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending"
    }, // <-- Ajouté
  },
  { timestamps: true }
);

export const ForwarderModel = mongoose.model<IForwarder>('Forwarder', ForwarderSchema);