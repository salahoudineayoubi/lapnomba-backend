import mongoose, { Document, Schema } from "mongoose";

/**
 * Paramètres du site modifiables depuis l'admin (document unique, clé
 * "global"). Lu via services/siteSettings.ts (cache en mémoire).
 */
export const SITE_SETTINGS_KEY = "global";

export interface ISiteSettings extends Document {
  key: string;
  /** Numéro WhatsApp support, chiffres seuls avec indicatif (ex. "237657588317"). */
  supportWhatsapp?: string;
  /** E-mail de l'admin ayant fait la dernière modification. */
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: { type: String, required: true, unique: true, default: SITE_SETTINGS_KEY },
    supportWhatsapp: { type: String, trim: true, match: /^\d{8,15}$/ },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

export const SiteSettingsModel = mongoose.model<ISiteSettings>("SiteSettings", SiteSettingsSchema);
