import mongoose, { Document, Schema } from "mongoose";

export interface INewsletterSubscribe extends Document {
  email: string;
  createdAt?: Date;
}

const NewsletterSubscribeSchema = new Schema<INewsletterSubscribe>(
  {
    email: { type: String, required: true, unique: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const NewsletterSubscribeModel = mongoose.model<INewsletterSubscribe>(
  "NewsletterSubscribe",
  NewsletterSubscribeSchema
);