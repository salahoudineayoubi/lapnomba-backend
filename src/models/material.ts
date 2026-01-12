import mongoose, { Schema, Document } from "mongoose";

export interface IMaterial extends Document {
  nom: string;
  telephone: string;
  email?: string;
  typeMateriel: string;
  etatMateriel: string;
  quantite: number;
  modeLivraison: string;
  adresse?: string;
  details?: string;
  createdAt: Date;
}

const MaterialSchema: Schema = new Schema(
  {
    nom: { type: String, required: true },
    telephone: { type: String, required: true },
    email: { type: String },
    typeMateriel: { type: String, required: true },
    etatMateriel: { type: String, required: true },
    quantite: { type: Number, required: true, min: 1 },
    modeLivraison: { type: String, required: true },
    adresse: { type: String },
    details: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Material || mongoose.model<IMaterial>("Material", MaterialSchema);