import mongoose, { Document, Schema } from "mongoose";

export interface IAwareness extends Document {
  titre: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const AwarenessSchema = new Schema<IAwareness>(
  {
    titre: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    videoUrl: { type: String }
  },
  { timestamps: true }
);

export const AwarenessModel = mongoose.model<IAwareness>("Awareness", AwarenessSchema);