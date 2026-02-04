import mongoose, { Document, Schema } from 'mongoose';

export interface ICommunityVoice extends Document {
  name: string;
  email?: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt: Date;
}

const CommunityVoiceSchema = new Schema<ICommunityVoice>(
  {
    name: { type: String, required: true },
    email: { type: String, required: false }, // Optionnel comme demandé
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    isApproved: { type: Boolean, default: false }, // Faux par défaut
  },
  { timestamps: true }
);

export const CommunityVoiceModel = mongoose.model<ICommunityVoice>('CommunityVoice', CommunityVoiceSchema);