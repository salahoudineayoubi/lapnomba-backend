import mongoose, { Document, Schema } from "mongoose";

export type EventStatus = "brouillon" | "publie";

export interface IEvent extends Document {
  titre: string;
  description: string;
  contenu?: string;
  lieu?: string;
  categorie?: string;
  dateEvenement: Date;
  images: string[];
  statut: EventStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    titre: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    contenu: { type: String, trim: true, maxlength: 5000 },
    lieu: { type: String, trim: true, maxlength: 200 },
    categorie: { type: String, trim: true, maxlength: 100 },
    dateEvenement: { type: Date, required: true },
    images: { type: [String], default: [] },
    statut: {
      type: String,
      enum: ["brouillon", "publie"],
      default: "brouillon",
      required: true,
    },
  },
  { timestamps: true }
);

// Liste publique triée par date, et filtrage admin par statut.
EventSchema.index({ statut: 1, dateEvenement: -1 });

export const EventModel = mongoose.model<IEvent>("Event", EventSchema);
