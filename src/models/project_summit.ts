import mongoose, { Document, Schema } from "mongoose";

export interface IProjectSummit extends Document {
  nomComplet: string;
  email: string;
  nomProjet: string;
  description: string;
  numeroWhatsapp: string;
  message?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProjectSummitSchema = new Schema<IProjectSummit>(
  {
    nomComplet: { type: String, required: true },
    email: { type: String, required: true },
    nomProjet: { type: String, required: true },
    description: { type: String, required: true },
    numeroWhatsapp: { type: String, required: true },
    message: { type: String }
  },
  { timestamps: true }
);

export const ProjectSummitModel = mongoose.model<IProjectSummit>("ProjectSummit", ProjectSummitSchema);