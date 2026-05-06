// models/academyPayment.ts
import { Schema, Document, model, models, Types } from "mongoose";

export interface IAcademyPayment extends Document {
  enrollmentId: Types.ObjectId;
  applicationId?: Types.ObjectId;

  amount: number;
  currency: string;

  paymentType: "monthly" | "full" | "registration_fee";
  month?: string;

  method:
    | "momo"
    | "orange_money"
    | "card"
    | "bank_transfer"
    | "cash"
    | "international";

  status: "pending" | "completed" | "failed" | "canceled" | "refunded";

  provider?: string;
  providerTransactionId?: string;
  providerReference?: string;
  providerPaymentUrl?: string;

  paidAt?: Date;
  note?: string;
}

const AcademyPaymentSchema = new Schema<IAcademyPayment>(
  {
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: "AcademyEnrollment",
      required: true,
    },

    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "AcademyApplication",
    },

    amount: { type: Number, required: true },
    currency: { type: String, default: "XAF" },

    paymentType: {
      type: String,
      enum: ["monthly", "full", "registration_fee"],
      default: "monthly",
    },

    month: { type: String },

    method: {
      type: String,
      enum: [
        "momo",
        "orange_money",
        "card",
        "bank_transfer",
        "cash",
        "international",
      ],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed", "canceled", "refunded"],
      default: "pending",
    },

    provider: { type: String },
    providerTransactionId: { type: String },
    providerReference: { type: String },
    providerPaymentUrl: { type: String },

    paidAt: { type: Date },
    note: { type: String },
  },
  { timestamps: true }
);

AcademyPaymentSchema.index({ enrollmentId: 1, status: 1 });
AcademyPaymentSchema.index({ providerTransactionId: 1 });

export default models.AcademyPayment ||
  model<IAcademyPayment>("AcademyPayment", AcademyPaymentSchema);