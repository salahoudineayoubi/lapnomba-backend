import mongoose, { Schema, Document } from "mongoose";

const PsychosocialSchema = new Schema({
  nomComplet: { type: String, required: true },
  age: { type: Number },
  pays: { type: String, required: true },
  ville: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  whatsapp: { type: String, required: true },
  specialite: { type: String, required: true },
  experienceAccompagnement: { type: String },
  motivationZaguina: { type: String, required: true },
  disponibilite: { type: String },
  statut: { type: String, default: "en attente" }
}, { timestamps: true });

export default mongoose.models.Psychosocial || mongoose.model("Psychosocial", PsychosocialSchema);