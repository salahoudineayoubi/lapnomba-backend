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

const uploadPhoto = async (photo: string) => {
  const file = path.join(DATA_DIR, photo);
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`Format de photo non pris en charge : ${photo}`);
  const dataUri = `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
  return uploadFromBase64(dataUri, { folder: "testimonials", resource_type: "image" });
};

/**
 * options.updatePhotos (--update-photos) : pour les témoignages déjà
 * présents, renvoie la photo du dossier seed-data et remplace l'avatar
 * (le texte et les traductions restent inchangés). Avec options.only
 * (--only="Nom complet"), limite à une personne.
 */
export const seedTestimonials = async (options: { updatePhotos?: boolean; only?: string } = {}) => {
  const entries: Entry[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "testimonials.json"), "utf8"));
  let created = 0;
  let skipped = 0;
  let photosUpdated = 0;

  for (const entry of entries) {
    const name = entry.nomComplet.trim();
    if (options.only && name.toLowerCase() !== options.only.trim().toLowerCase()) continue;
    const byName = { nomComplet: new RegExp(`^${escapeRegex(name)}$`, "i") };
    const exists = await TestimonialModel.exists(byName);
    if (exists) {
      if (options.updatePhotos) {
        const uploaded = await uploadPhoto(entry.photo);
        await TestimonialModel.updateOne(byName, { $set: { avatar: uploaded.secure_url } });
        console.log(`🖼  photo mise à jour : ${name}`);
        photosUpdated++;
      } else {
        console.log(`↷ déjà présent, inchangé : ${name}`);
      }
      skipped++;
      continue;
    }

    const uploaded = await uploadPhoto(entry.photo);

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

  return { created, skipped, photosUpdated, total: entries.length };
};

if (require.main === module) {
  (async () => {
    await connectMongo();
    const args = process.argv.slice(2);
    const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);
    const result = await seedTestimonials({ updatePhotos: args.includes("--update-photos"), only });
    console.log(
      `📦 Témoignages : ${result.created} ajouté(s), ${result.skipped} déjà présent(s) (dont ${result.photosUpdated} photo(s) mise(s) à jour), ${result.total} au total.`
    );
    await mongoose.disconnect();
    process.exit(0);
  })().catch((err) => {
    console.error("❌ Échec de l'import des témoignages :", err);
    process.exit(1);
  });
}
