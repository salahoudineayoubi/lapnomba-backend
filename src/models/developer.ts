import mongoose, { Schema, Document } from "mongoose";

export interface IDeveloper extends Document {
  nomComplet: string;
  emailProfessionnel: string;
  portfolio?: string;
  domaineExpertise: string;
  motivation?: string;
  disponible4h: boolean;
  createdAt: Date;
}

const DeveloperSchema: Schema = new Schema(
  {
    nomComplet: { type: String, required: true },
    emailProfessionnel: { type: String, required: true },
    portfolio: { type: String },
    domaineExpertise: { type: String, required: true },
    motivation: { type: String },
    disponible4h: { type: Boolean, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Developer || mongoose.model<IDeveloper>("Developer", DeveloperSchema);