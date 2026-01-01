import mongoose, { Schema, Document } from "mongoose";

export interface IAmbassador extends Document {
  nomComplet: string;
  age: number;
  pays: string;
  ville: string;
  email: string;
  whatsapp: string;
  platforms: string[];
  profileLink: string;
  audienceSize: string;
  contentTypes: string;
  motivation: string;
  experience?: string;
  statut: "en attente" | "approuvé" | "refusé";
  createdAt: Date;
}

const AmbassadorSchema: Schema = new Schema(
  {
    nomComplet: { type: String, required: true },
    age: { type: Number },
    pays: { type: String, required: true },
    ville: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    whatsapp: { type: String, required: true },
    platforms: [{ type: String }],
    profileLink: { type: String, required: true },
    audienceSize: { type: String },
    contentTypes: { type: String },
    motivation: { type: String, required: true },
    experience: { type: String },
    statut: { type: String, default: "en attente" },
  },
  { timestamps: true }
);

export default mongoose.models.Ambassador || mongoose.model<IAmbassador>("Ambassador", AmbassadorSchema);