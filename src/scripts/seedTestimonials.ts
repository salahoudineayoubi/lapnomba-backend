/**
 * Import des témoignages écrits (nom complet, poste, photo, texte) depuis
 * seed-data/testimonials/testimonials.json (dossier non commité : données
 * personnelles).
 *
 * - Chaque photo est envoyée sur Cloudinary (dossier "testimonials").
 * - Idempotent : un témoignage dont le nom complet existe déjà n'est PAS
 *   modifié, pour ne jamais écraser ce qui a été édité depuis l'admin.
 * - Ensuite, tout se modifie depuis l'admin (onglet Témoignages).
 *
 * Usage : npm run seed:testimonials   (avec le .env de l'environnement visé)
 */

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectMongo } from "../data-source";
import { TestimonialModel } from "../models/testimonial";
import { uploadFromBase64 } from "../utils/cloudinary";

type Entry = {
  nomComplet: string;
  poste?: string;
  posteI18n?: Record<string, string>;
  photo: string;
  temoignage: string;
  temoignageI18n?: Record<string, string>;
};

const DATA_DIR = path.resolve(__dirname, "../../seed-data/testimonials");
const MIME: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const seedTestimonials = async () => {
  const entries: Entry[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "testimonials.json"), "utf8"));
  let created = 0;
  let skipped = 0;

  for (const entry of entries) {
    const name = entry.nomComplet.trim();
    const exists = await TestimonialModel.exists({ nomComplet: new RegExp(`^${escapeRegex(name)}$`, "i") });
    if (exists) {
      console.log(`↷ déjà présent, inchangé : ${name}`);
      skipped++;
      continue;
    }

    const file = path.join(DATA_DIR, entry.photo);
    const mime = MIME[path.extname(file).toLowerCase()];
    if (!mime) throw new Error(`Format de photo non pris en charge : ${entry.photo}`);
    const dataUri = `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
    const uploaded = await uploadFromBase64(dataUri, { folder: "testimonials", resource_type: "image" });

    await TestimonialModel.create({
      nomComplet: name,
      poste: entry.poste?.trim() || undefined,
      posteI18n: entry.posteI18n,
      avatar: uploaded.secure_url,
      temoignage: entry.temoignage.trim(),
      temoignageI18n: entry.temoignageI18n,
    });
    console.log(`✓ ajouté : ${name}`);
    created++;
  }

  return { created, skipped, total: entries.length };
};

if (require.main === module) {
  (async () => {
    await connectMongo();
    const result = await seedTestimonials();
    console.log(`📦 Témoignages : ${result.created} ajouté(s), ${result.skipped} déjà présent(s), ${result.total} au total.`);
    await mongoose.disconnect();
    process.exit(0);
  })().catch((err) => {
    console.error("❌ Échec de l'import des témoignages :", err);
    process.exit(1);
  });
}
