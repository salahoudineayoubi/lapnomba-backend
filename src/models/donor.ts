import mongoose, { Document, Schema, Types } from "mongoose";

export type DonationCategory = "FINANCIAL" | "MATERIAL" | "SPONSORSHIP" | "CROWDFUNDING";
export type PaymentMethod = "MOMO" | "ORANGE_MONEY" | "CARD" | "PAYPAL" | "CRYPTO" | "BANK_TRANSFER" | "CASH";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELED" | "REFUNDED";

export interface IDonation extends Document {
  // Donateur
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  anonymous?: boolean;

  // Don
  category: DonationCategory;
  amount: number;
  currency: string; // "XAF", "USD", "EUR"...
  message?: string;
  futureContact: boolean;

  // Paiement
  paymentMethod: PaymentMethod;
  status: PaymentStatus;

  // Références externes (PayPal / providers)
  provider?: "PAYPAL" | "MOMO" | "OM" | "CARD" | "CRYPTO";
  providerOrderId?: string;   // PayPal order id
  providerCaptureId?: string; // PayPal capture id
  providerTransactionId?: string; // MoMo/OM/Card transaction id

  // Liens métier
  materialDonationId?: Types.ObjectId;     // si category MATERIAL
  sponsorshipId?: Types.ObjectId;          // si category SPONSORSHIP
  campaignId?: Types.ObjectId;             // si category CROWDFUNDING

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

const DonationSchema = new Schema<IDonation>(
  {
    donorName: { type: String, required: true, trim: true },
    donorEmail: { type: String, required: true, trim: true, lowercase: true },
    donorPhone: { type: String },
    anonymous: { type: Boolean, default: false },

    category: { type: String, enum: ["FINANCIAL", "MATERIAL", "SPONSORSHIP", "CROWDFUNDING"], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "XAF" },
    message: { type: String },
    futureContact: { type: Boolean, default: false },

    paymentMethod: { type: String, enum: ["MOMO","ORANGE_MONEY","CARD","PAYPAL","CRYPTO","BANK_TRANSFER","CASH"], required: true },
    status: { type: String, enum: ["PENDING","COMPLETED","FAILED","CANCELED","REFUNDED"], default: "PENDING" },

    provider: { type: String, enum: ["PAYPAL","MOMO","OM","CARD","CRYPTO"] },
    providerOrderId: { type: String },
    providerCaptureId: { type: String },
    providerTransactionId: { type: String },

    materialDonationId: { type: Schema.Types.ObjectId, ref: "MaterialDonation" },
    sponsorshipId: { type: Schema.Types.ObjectId, ref: "Sponsorship" },
    campaignId: { type: Schema.Types.ObjectId, ref: "CrowdfundingCampaign" },
  },
  { timestamps: true }
);

DonationSchema.index({ donorEmail: 1, createdAt: -1 });
DonationSchema.index({ status: 1, createdAt: -1 });
DonationSchema.index({ category: 1, createdAt: -1 });
DonationSchema.index({ campaignId: 1, status: 1 });

export const DonationModel = mongoose.model<IDonation>("Donation", DonationSchema);
