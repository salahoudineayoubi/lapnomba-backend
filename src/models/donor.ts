import mongoose, { Document, Schema } from "mongoose";

export interface IDonor extends Document {
  nom: string;
  email: string;
  montant: number;
  typePaiement: string;
  numeroMobileMoney?: string;
  bankName?: string;
  bankAccount?: string;
  bankSwift?: string;
  commentaire?: string;
  futureContact: boolean;
  date?: Date;
}

const DonorSchema = new Schema<IDonor>(
  {
    nom: { type: String, required: true },
    email: { type: String, required: true },
    montant: { type: Number, required: true },
    typePaiement: { type: String, required: true },
    numeroMobileMoney: { type: String },
    bankName: { type: String },
    bankAccount: { type: String },
    bankSwift: { type: String },
    commentaire: { type: String },
    futureContact: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

export const DonorModel = mongoose.model<IDonor>("Donor", DonorSchema);