import mongoose, { Document, Schema, Types } from "mongoose";

export type DonationCategory =
  | "FINANCIAL"
  | "MATERIAL"
  | "SPONSORSHIP"
  | "CROWDFUNDING";

export type PaymentMethod =
  | "MOMO"
  | "ORANGE_MONEY"
  | "CARD"
  | "PAYPAL"
  | "CRYPTO"
  | "BANK_TRANSFER"
  | "CASH";

export type PaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
  | "REFUNDED";

// Provider = seulement les PSP (pas BANK_TRANSFER/CASH)
export type PaymentProvider = "PAYPAL" | "MOMO" | "OM" | "CARD" | "CRYPTO";

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

  // Provider (si applicable)
  provider?: PaymentProvider;
  providerOrderId?: string; // PayPal order id
  providerCaptureId?: string; // PayPal capture id
  providerTransactionId?: string; // MoMo/OM/Card transaction id

  // Virement bancaire (si paymentMethod === BANK_TRANSFER)
  bankTransfer?: {
    reference?: string; // référence/objet du virement (TRÈS important)
    senderBank?: string; // banque émettrice
    sentAt?: Date; // date annoncée du virement
    proofUrl?: string; // reçu (url Cloudinary) optionnel
  };

  // Liens métier
  materialDonationId?: Types.ObjectId; // si category MATERIAL
  sponsorshipId?: Types.ObjectId; // si category SPONSORSHIP
  campaignId?: Types.ObjectId; // si category CROWDFUNDING

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

const DonationSchema = new Schema<IDonation>(
  {
    // Donateur
    donorName: { type: String, required: true, trim: true },
    donorEmail: { type: String, required: true, trim: true, lowercase: true },
    donorPhone: { type: String },
    anonymous: { type: Boolean, default: false },

    // Don
    category: {
      type: String,
      enum: ["FINANCIAL", "MATERIAL", "SPONSORSHIP", "CROWDFUNDING"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "XAF" },
    message: { type: String },
    futureContact: { type: Boolean, default: false },

    // Paiement
    paymentMethod: {
      type: String,
      enum: ["MOMO", "ORANGE_MONEY", "CARD", "PAYPAL", "CRYPTO", "BANK_TRANSFER", "CASH"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "CANCELED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },

    // Provider (uniquement si PSP)
    provider: { type: String, enum: ["PAYPAL", "MOMO", "OM", "CARD", "CRYPTO"] },
    providerOrderId: { type: String },
    providerCaptureId: { type: String },
    providerTransactionId: { type: String },

    // Virement (uniquement si BANK_TRANSFER)
    bankTransfer: {
      reference: { type: String, trim: true },
      senderBank: { type: String, trim: true },
      sentAt: { type: Date },
      proofUrl: { type: String, trim: true },
    },

    // Liens métier
    materialDonationId: { type: Schema.Types.ObjectId, ref: "MaterialDonation" },
    sponsorshipId: { type: Schema.Types.ObjectId, ref: "Sponsorship" },
    campaignId: { type: Schema.Types.ObjectId, ref: "CrowdfundingCampaign" },
  },
  { timestamps: true }
);

// Index utiles
DonationSchema.index({ donorEmail: 1, createdAt: -1 });
DonationSchema.index({ status: 1, createdAt: -1 });
DonationSchema.index({ category: 1, createdAt: -1 });
DonationSchema.index({ campaignId: 1, status: 1 });

// (Optionnel mais recommandé) Validation métier
DonationSchema.pre("validate", function (next) {
  const doc = this as IDonation;

  // 1) Provider doit être vide si BANK_TRANSFER ou CASH
  if (doc.paymentMethod === "BANK_TRANSFER" || doc.paymentMethod === "CASH") {
    doc.provider = undefined;
    doc.providerOrderId = undefined;
    doc.providerCaptureId = undefined;
    doc.providerTransactionId = undefined;
  }

  // 2) bankTransfer ne doit être rempli que si BANK_TRANSFER
  if (doc.paymentMethod !== "BANK_TRANSFER" && doc.bankTransfer) {
    doc.bankTransfer = undefined;
  }

  next();
});

export const DonationModel = mongoose.model<IDonation>("Donation", DonationSchema);

/**
 * Helper (à mettre dans un fichier utils si tu veux)
 * Pour éviter les erreurs: ORANGE_MONEY => OM, etc.
 */
export const providerFromPaymentMethod = (m: PaymentMethod): PaymentProvider | undefined => {
  if (m === "PAYPAL") return "PAYPAL";
  if (m === "MOMO") return "MOMO";
  if (m === "ORANGE_MONEY") return "OM";
  if (m === "CARD") return "CARD";
  if (m === "CRYPTO") return "CRYPTO";
  return undefined; // BANK_TRANSFER / CASH
};
