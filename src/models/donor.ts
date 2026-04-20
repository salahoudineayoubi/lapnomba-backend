import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type DonationCategory =
  | "FINANCIAL"
  | "MATERIAL"
  | "SPONSORSHIP"
  | "CROWDFUNDING";

export type PaymentMethod =
  | "MOMO"
  | "ORANGE_MONEY"
  | "CARD"
  | "CRYPTO"
  | "BANK_TRANSFER"
  | "CASH";

export type PaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
  | "REFUNDED";

export type PaymentProvider = "MOMO" | "OM" | "CARD" | "CRYPTO";

export interface IBankTransferInfo {
  reference?: string;
  senderBank?: string;
  sentAt?: Date;
  proofUrl?: string;
}

export interface IDonation extends Document {
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  anonymous?: boolean;

  category: DonationCategory;
  amount: number;
  currency: string;
  message?: string;
  futureContact: boolean;

  paymentMethod: PaymentMethod;
  status: PaymentStatus;

  provider?: PaymentProvider;
  providerOrderId?: string;
  providerCaptureId?: string;
  providerTransactionId?: string;
  providerReference?: string;
  providerPaymentUrl?: string;
  providerStatusRaw?: string;
  providerResponse?: any;
  webhookPayload?: any;

  bankTransfer?: IBankTransferInfo;

  materialDonationId?: Types.ObjectId;
  sponsorshipId?: Types.ObjectId;
  campaignId?: Types.ObjectId;

  paidAt?: Date;
  failedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const BankTransferInfoSchema = new Schema<IBankTransferInfo>(
  {
    reference: { type: String, trim: true },
    senderBank: { type: String, trim: true },
    sentAt: { type: Date },
    proofUrl: { type: String, trim: true },
  },
  { _id: false }
);

const DonationSchema = new Schema<IDonation>(
  {
    donorName: {
      type: String,
      required: true,
      trim: true,
    },

    donorEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    donorPhone: {
      type: String,
      trim: true,
    },

    anonymous: {
      type: Boolean,
      default: false,
    },

    category: {
      type: String,
      enum: ["FINANCIAL", "MATERIAL", "SPONSORSHIP", "CROWDFUNDING"],
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    currency: {
      type: String,
      required: true,
      default: "XAF",
      uppercase: true,
      trim: true,
    },

    message: {
      type: String,
      trim: true,
    },

    futureContact: {
      type: Boolean,
      default: false,
    },

    paymentMethod: {
      type: String,
      enum: ["MOMO", "ORANGE_MONEY", "CARD", "CRYPTO", "BANK_TRANSFER", "CASH"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "CANCELED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },

    provider: {
      type: String,
      enum: ["MOMO", "OM", "CARD", "CRYPTO"],
      index: true,
    },

    providerOrderId: {
      type: String,
      trim: true,
      index: true,
    },

    providerCaptureId: {
      type: String,
      trim: true,
    },

    providerTransactionId: {
      type: String,
      trim: true,
      index: true,
    },

    providerReference: {
      type: String,
      trim: true,
      index: true,
    },

    providerPaymentUrl: {
      type: String,
      trim: true,
    },

    providerStatusRaw: {
      type: String,
      trim: true,
    },

    providerResponse: {
      type: Schema.Types.Mixed,
    },

    webhookPayload: {
      type: Schema.Types.Mixed,
    },

    bankTransfer: {
      type: BankTransferInfoSchema,
      default: undefined,
    },

    materialDonationId: {
      type: Schema.Types.ObjectId,
      ref: "MaterialDonation",
    },

    sponsorshipId: {
      type: Schema.Types.ObjectId,
      ref: "Sponsorship",
    },

    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "CrowdfundingCampaign",
      index: true,
    },

    paidAt: {
      type: Date,
    },

    failedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

DonationSchema.index({ donorEmail: 1, createdAt: -1 });
DonationSchema.index({ status: 1, createdAt: -1 });
DonationSchema.index({ category: 1, createdAt: -1 });
DonationSchema.index({ campaignId: 1, status: 1 });
DonationSchema.index({ provider: 1, providerOrderId: 1 });
DonationSchema.index({ provider: 1, providerTransactionId: 1 });
DonationSchema.index({ providerReference: 1 });
DonationSchema.index({ paymentMethod: 1, createdAt: -1 });

DonationSchema.pre("validate", function (next) {
  const doc = this as IDonation;

  if (!doc.donorName?.trim()) {
    return next(new Error("Le nom du donateur est requis."));
  }

  if (!doc.donorEmail?.includes("@")) {
    return next(new Error("Une adresse email valide est requise."));
  }

  if (!doc.currency?.trim()) {
    doc.currency = "XAF";
  }

  doc.currency = doc.currency.toUpperCase().trim();
  doc.donorEmail = doc.donorEmail.toLowerCase().trim();

  if (doc.donorPhone) {
    doc.donorPhone = doc.donorPhone.trim();
  }

  if (doc.amount <= 0) {
    return next(new Error("Le montant du don doit être supérieur à 0."));
  }

  if (doc.paymentMethod === "BANK_TRANSFER" || doc.paymentMethod === "CASH") {
    doc.provider = undefined;
    doc.providerOrderId = undefined;
    doc.providerCaptureId = undefined;
    doc.providerTransactionId = undefined;
    doc.providerReference = undefined;
    doc.providerPaymentUrl = undefined;
    doc.providerStatusRaw = undefined;
  } else {
    if (!doc.provider) {
      doc.provider = providerFromPaymentMethod(doc.paymentMethod);
    }
  }

  if (doc.paymentMethod !== "BANK_TRANSFER") {
    doc.bankTransfer = undefined;
  }

  if (doc.paymentMethod === "BANK_TRANSFER" && !doc.bankTransfer?.reference?.trim()) {
    return next(new Error("La référence du virement bancaire est requise."));
  }

  next();
});

export const providerFromPaymentMethod = (
  method: PaymentMethod
): PaymentProvider | undefined => {
  if (method === "MOMO") return "MOMO";
  if (method === "ORANGE_MONEY") return "OM";
  if (method === "CARD") return "CARD";
  if (method === "CRYPTO") return "CRYPTO";
  return undefined;
};

const DonationModelInstance: Model<IDonation> =
  (mongoose.models.Donation as Model<IDonation>) ||
  mongoose.model<IDonation>("Donation", DonationSchema);

export const DonationModel = DonationModelInstance;