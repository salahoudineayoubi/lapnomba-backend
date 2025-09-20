import mongoose, { Schema, Document } from "mongoose";

export interface ProjectSummitDocument extends Document {
  nomComplet: string;
  email: string;
  nomProjet: string;
  description: string;
  numeroWhatsapp: string; 
  dateSoumission: Date;
}

const ProjectSummitSchema = new Schema<ProjectSummitDocument>({
  nomComplet: { type: String, required: true },
  email: { type: String, required: true },
  nomProjet: { type: String, required: true },
  description: { type: String, required: true },
  numeroWhatsapp: { type: String, required: true }, 
  dateSoumission: { type: Date, default: Date.now }
});

export default mongoose.model<ProjectSummitDocument>("ProjectSummit", ProjectSummitSchema);