import mongoose, { Schema, Document } from "mongoose";

export interface NewsletterSubscribeDocument extends Document {
  email: string;
  createdAt?: Date; // Ajouté pour la date de souscription
}

const NewsletterSubscribeSchema = new Schema<NewsletterSubscribeDocument>({
  email: { type: String, required: true }
}, { timestamps: true }); // Ajoute les timestamps

NewsletterSubscribeSchema.index({ email: 1 }, { unique: true });

export default mongoose.model<NewsletterSubscribeDocument>("NewsletterSubscribe", NewsletterSubscribeSchema);