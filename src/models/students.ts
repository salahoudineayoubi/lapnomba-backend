import mongoose, { Document, Schema } from "mongoose";

export interface IStudent extends Document {
  name: string;
  prenom: string;
  email: string;
  niveauEtude: string;
  dateNaissance: Date;
  ville: string;
  numeroWhatsapp: string;
  dateInscription?: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true },
    prenom: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    niveauEtude: { type: String, required: true },
    dateNaissance: { type: Date, required: true },
    ville: { type: String, required: true },
    numeroWhatsapp: { type: String, required: true },
    dateInscription: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

export const StudentModel = mongoose.model<IStudent>("Student", StudentSchema);