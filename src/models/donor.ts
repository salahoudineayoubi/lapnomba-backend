import mongoose, { Schema, Document } from "mongoose";

export interface DonateurDocument extends Document {
  nom: string;
  email: string;
  montant: number;
  typePaiement: "visa" | "transfert_bancaire" | "mobile_money";
  date?: Date;
}

const DonateurSchema = new Schema<DonateurDocument>({
  nom: { type: String, required: true },
  email: { type: String, required: true },
  montant: { type: Number, required: true },
  typePaiement: { type: String, enum: ["visa", "transfert_bancaire", "mobile_money"], required: true },
  date: { type: Date, default: Date.now }
});

export default mongoose.model<DonateurDocument>("Donateur", DonateurSchema);