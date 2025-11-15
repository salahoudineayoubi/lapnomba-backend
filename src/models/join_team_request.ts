import mongoose, { Document, Schema } from "mongoose";

export interface IJoinTeamRequest extends Document {
  nomComplet: string;
  email: string;
  numeroWhatsapp: string;
  message: string;
  profession: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const JoinTeamRequestSchema = new Schema<IJoinTeamRequest>(
  {
    nomComplet: { type: String, required: true },
    email: { type: String, required: true },
    numeroWhatsapp: { type: String, required: true },
    message: { type: String, required: true },
    profession: { type: String, required: true }
  },
  { 
    timestamps: true 
  }
);

JoinTeamRequestSchema.index(
  { nomComplet: 1, email: 1, numeroWhatsapp: 1 },
  { unique: true }
);

export const JoinTeamRequestModel = mongoose.model<IJoinTeamRequest>(
  "JoinTeamRequest",
  JoinTeamRequestSchema
);