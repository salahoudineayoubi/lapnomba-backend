import mongoose, { Schema } from "mongoose";

const AwarenessAgentSchema = new Schema({
  nomComplet: { type: String, required: true },
  age: { type: Number },
  pays: { type: String, required: true },
  ville: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  whatsapp: { type: String, required: true },
  zoneIntervention: { type: String, required: true },
  occupationActuelle: { type: String },
  experienceOratoire: { type: String },
  disponibiliteHebdo: { type: String },
  motivationTerrain: { type: String, required: true },
  statut: { type: String, default: "en attente" }
}, { timestamps: true });

export default mongoose.models.AwarenessAgent || mongoose.model("AwarenessAgent", AwarenessAgentSchema);