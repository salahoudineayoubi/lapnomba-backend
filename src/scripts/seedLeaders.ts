/**
 * Import des 6 leaders affichés jusqu'ici en dur sur lapnomba.org/leaders.
 *
 * - Titres et biographies (fr / en / tr / ar) : clés leaders.N.title et
 *   leaders.N.description des fichiers frontend/public/locales/<langue>/translate.json.
 * - Photos : frontend/src/assets/images/leaders, envoyées sur Cloudinary (dossier "leaders").
 * - Idempotent : un leader dont le slug existe déjà n'est PAS modifié, pour ne
 *   jamais écraser ce qui a été édité depuis l'admin.
 * - Ensuite, tout se gère depuis l'admin (onglet Leaders).
 *
 * Usage (depuis le dossier backend, avec le .env de l'environnement visé) :
 *   npm run seed:leaders
 *   npm run seed:leaders -- --frontend=/chemin/vers/frontend   (si le dépôt frontend n'est pas à côté)
 *   npm run seed:leaders -- --dry-run                          (vérifie les fichiers, sans base ni Cloudinary)
 */

import fs from "fs";
import path from "path";
import { LocalizedText } from "../models/testimonial";

export type LeaderSeedSource = {
  /** Numéro N des clés de traduction leaders.N.* */
  key: number;
  slug: string;
  name: string;
  /** Fichier dans frontend/src/assets/images/leaders */
  image: string;
};

/** Même ordre, mêmes noms et mêmes photos que frontend/src/pages/leaders. */
export const LEADER_SEED_SOURCES: LeaderSeedSource[] = [
  { key: 3, slug: "abdel-naser", name: "Abdel Naser Pouamoun", image: "Nasr.png" },
  { key: 1, slug: "pemi-salaoudine", name: "Ayoubi Ben Ali Pemi Salaoudine", image: "salahoudine.jpg" },
  { key: 2, slug: "njouenwet-mbete", name: "Njouenwet Mbete Assan", image: "fadil.png" },
  { key: 4, slug: "abdel-aziz-kamo-megna", name: "Abdel Aziz Kamo Megna", image: "abdel.jpg" },
  { key: 5, slug: "cabrel-domfang", name: "Cabrel Domfang", image: "cabrel.jpg" },
  { key: 6, slug: "diemsa-fatima-amira", name: "Diemsa Fatima Amira", image: "diemsa.jpg" },
];

const LANGS = ["fr", "en", "tr", "ar"] as const;
const MIME: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

export type LeaderSeed = {
  slug: string;
  name: string;
  title: LocalizedText;
  bio: LocalizedText;
  order: number;
  photoPath: string;
  photoMime: string;
};

export const DEFAULT_FRONTEND_DIR = path.resolve(__dirname, "../../../frontend");

/** Lit les traductions et vérifie les photos ; ne touche ni à la base ni à Cloudinary. */
export const buildLeaderSeeds = (frontendDir: string = DEFAULT_FRONTEND_DIR): LeaderSeed[] => {
  const locales = Object.fromEntries(
    LANGS.map((lang) => {
      const file = path.join(frontendDir, "public", "locales", lang, "translate.json");
      if (!fs.existsSync(file)) throw new Error(`Fichier de traduction introuvable : ${file}`);
      return [lang, JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>];
    })
  ) as Record<(typeof LANGS)[number], Record<string, string>>;

  const pick = (key: string): LocalizedText => {
    const out: LocalizedText = {};
    for (const lang of LANGS) {
      const value = typeof locales[lang][key] === "string" ? locales[lang][key].trim() : "";
      if (value) out[lang] = value;
    }
    return out;
  };

  return LEADER_SEED_SOURCES.map((src, order) => {
    const title = pick(`leaders.${src.key}.title`);
    const bio = pick(`leaders.${src.key}.description`);
    if (!title.fr) throw new Error(`Titre français manquant : leaders.${src.key}.title`);
    const photoPath = path.join(frontendDir, "src", "assets", "images", "leaders", src.image);
    if (!fs.existsSync(photoPath)) throw new Error(`Photo introuvable : ${photoPath}`);
    const photoMime = MIME[path.extname(photoPath).toLowerCase()];
    if (!photoMime) throw new Error(`Format de photo non pris en charge : ${src.image}`);
    return { slug: src.slug, name: src.name, title, bio, order, photoPath, photoMime };
  });
};

type SeedDeps = {
  exists: (slug: string) => Promise<boolean>;
  upload: (dataUri: string) => Promise<{ secure_url: string; public_id: string }>;
  create: (doc: Record<string, unknown>) => Promise<unknown>;
  log?: (msg: string) => void;
};

/** Insère les leaders absents (par slug) ; les dépendances sont injectées pour les tests. */
export const seedLeaders = async (seeds: LeaderSeed[], deps: SeedDeps) => {
  const log = deps.log ?? console.log;
  let created = 0;
  let skipped = 0;
  for (const seed of seeds) {
    if (await deps.exists(seed.slug)) {
      log(`↷ déjà présent, inchangé : ${seed.name} (${seed.slug})`);
      skipped++;
      continue;
    }
    const dataUri = `data:${seed.photoMime};base64,${fs.readFileSync(seed.photoPath).toString("base64")}`;
    const uploaded = await deps.upload(dataUri);
    await deps.create({
      name: seed.name,
      slug: seed.slug,
      title: seed.title,
      bio: seed.bio,
      avatar: uploaded.secure_url,
      avatarPublicId: uploaded.public_id,
      order: seed.order,
      isActive: true,
    });
    log(`✓ ajouté : ${seed.name} (${seed.slug})`);
    created++;
  }
  return { created, skipped, total: seeds.length };
};

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const frontendDir = args.find((a) => a.startsWith("--frontend="))?.slice("--frontend=".length) || DEFAULT_FRONTEND_DIR;
    const seeds = buildLeaderSeeds(path.resolve(frontendDir));

    if (args.includes("--dry-run")) {
      for (const s of seeds) console.log(`• ${s.order} ${s.slug} — ${s.title.fr} [${Object.keys(s.bio).join(", ")}] ${path.basename(s.photoPath)}`);
      console.log(`Vérification OK : ${seeds.length} leaders prêts (aucune écriture).`);
      return;
    }

    // Chargés ici seulement : le mode --dry-run et les tests n'ont besoin ni de la base ni de Cloudinary.
    const mongoose = (await import("mongoose")).default;
    const { connectMongo } = await import("../data-source");
    const { LeaderModel } = await import("../models/leader");
    const { uploadFromBase64 } = await import("../utils/cloudinary");

    await connectMongo();
    const result = await seedLeaders(seeds, {
      exists: async (slug) => Boolean(await LeaderModel.exists({ slug })),
      upload: (dataUri) => uploadFromBase64(dataUri, { folder: "leaders", resource_type: "image" }),
      create: (doc) => LeaderModel.create(doc),
    });
    console.log(`📦 Leaders : ${result.created} ajouté(s), ${result.skipped} déjà présent(s), ${result.total} au total.`);
    await mongoose.disconnect();
    process.exit(0);
  })().catch((err) => {
    console.error("❌ Échec de l'import des leaders :", err);
    process.exit(1);
  });
}
