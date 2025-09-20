import mongoose, { Schema, Document } from "mongoose";

export interface JoinTeamRequestDocument extends Document {
  nomComplet: string;
  email: string;
  numeroWhatsapp: string;
  message: string;
  profession: string; 
  createdAt?: Date; 
  updatedAt?: Date;
}

const JoinTeamRequestSchema = new Schema<JoinTeamRequestDocument>({
  nomComplet: { type: String, required: true },
  email: { type: String, required: true },
  numeroWhatsapp: { type: String, required: true },
  message: { type: String, required: true },
  profession: { type: String, required: true }
}, { timestamps: true }); 


JoinTeamRequestSchema.index(
  { nomComplet: 1, email: 1, numeroWhatsapp: 1 },
  { unique: true }
);

export default mongoose.model<JoinTeamRequestDocument>("JoinTeamRequest", JoinTeamRequestSchema);