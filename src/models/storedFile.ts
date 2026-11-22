import mongoose, { Document, Schema } from "mongoose";

/**
 * Fichier gardé dans NOTRE base quand Cloudinary refuse un envoi (compte suspendu,
 * panne, quota). Dès que Cloudinary répond de nouveau, le fichier y est transféré
 * automatiquement (migratedUrl / migratedPublicId) et ses octets sont effacés d'ici.
 */
export interface IStoredFile extends Document {
  visibility: "public" | "private";
  resourceType: "image" | "raw";
  contentType: string;
  ext: string;
  folder?: string;
  bytes: number;
  data?: Buffer;
  migratedUrl?: string;
  migratedPublicId?: string;
  migratedAt?: Date;
  migrationAttempts: number;
  lastError?: string;
  createdAt?: Date;
}

const StoredFileSchema = new Schema<IStoredFile>(
  {
    visibility: { type: String, enum: ["public", "private"], required: true },
    resourceType: { type: String, enum: ["image", "raw"], default: "image" },
    contentType: { type: String, required: true },
    ext: { type: String, required: true },
    folder: { type: String },
    bytes: { type: Number, required: true },
    data: { type: Buffer },
    migratedUrl: { type: String },
    migratedPublicId: { type: String },
    migratedAt: { type: Date, index: true },
    migrationAttempts: { type: Number, default: 0 },
    lastError: { type: String },
  },
  { timestamps: true }
);

export const StoredFileModel = mongoose.model<IStoredFile>("StoredFile", StoredFileSchema);
