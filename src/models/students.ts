import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  name: string;
  prenom: string;
  email: string;
  niveauEtude: string;
  dateNaissance: Date;
  ville: string;
  numeroWhatsapp: string;
  dateInscription: Date;
}

const StudentSchema: Schema = new Schema({
  name: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  niveauEtude: { type: String, required: true },
  dateNaissance: { type: Date, required: true },
  ville: { type: String, required: true },
  numeroWhatsapp: { type: String, required: true },
  dateInscription: { type: Date, required: true }
});

export default mongoose.model<IStudent>('Student', StudentSchema);
