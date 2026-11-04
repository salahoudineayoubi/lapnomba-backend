/**
 * Migration idempotente : catalogue statique Academy (Phase 2,
 * academy/src/constants/trainingCatalog.ts) → MongoDB (AcademyProgram),
 * qui devient la source canonique du catalogue public (Phase 3).
 *
 * - Upsert par `slug` : sûr à exécuter plusieurs fois (aucun doublon créé).
 * - Ne touche jamais un programme Mongo existant dont le slug ne fait PAS
 *   partie de cette liste (aucun programme créé depuis l'admin n'est
 *   supprimé ou écrasé).
 * - Aucune formation "Trading" : volontairement absente de cette liste
 *   (retirée en Phase 2, voir rapport — ne jamais la réintroduire ici).
 * - Ne s'exécute PAS automatiquement au démarrage du serveur : script
 *   manuel, à lancer explicitement (`npm run seed:academy-programs`).
 *
 * Usage : npx ts-node src/scripts/seedAcademyPrograms.ts
 */

import mongoose from "mongoose";
import { connectMongo } from "../data-source";
import AcademyProgram from "../models/acdemy/program";

// Mêmes 9 formations que academy/src/constants/trainingCatalog.ts (Phase 2),
// sans les imports d'images (gérées côté frontend — voir rapport Phase 3,
// section "Frontend Catalog Migration" pour la stratégie de pont visuel).
const SOURCE_CATALOG = [
  {
    title: "Développement Web & Mobile",
    slug: "developpement-web-mobile",
    category: "Développement",
    description: "Frontend, Backend, APIs et applications mobiles modernes.",
    durationMonths: 12,
    monthlyPrice: 30000,
    onlinePrice: 500000,
    hybridPrice: 800000,
    availableModes: ["online", "hybrid"],
  },
  {
    title: "Data Science & Intelligence Artificielle",
    slug: "data-science-intelligence-artificielle",
    category: "IA & Data",
    description: "Machine Learning, IA générative, data analysis et projets réels.",
    durationMonths: 12,
    monthlyPrice: 30000,
    onlinePrice: 500000,
    hybridPrice: 800000,
    availableModes: ["online", "hybrid"],
  },
  {
    title: "Cybersécurité",
    slug: "cybersecurite",
    category: "Sécurité",
    description: "Hacking éthique, sécurité réseau, défense et protection des systèmes.",
    durationMonths: 12,
    monthlyPrice: 30000,
    onlinePrice: 500000,
    hybridPrice: 800000,
    availableModes: ["online", "hybrid"],
  },
  {
    title: "Cloud Computing & DevOps",
    slug: "cloud-devops",
    category: "Infrastructure",
    description: "Cloud, CI/CD, Docker, Kubernetes et infrastructures scalables.",
    durationMonths: 12,
    monthlyPrice: 30000,
    onlinePrice: 500000,
    hybridPrice: 800000,
    availableModes: ["online", "hybrid"],
  },
  {
    title: "UI/UX Design",
    slug: "ui-ux-design",
    category: "Design",
    description: "Design produit, expérience utilisateur et interfaces modernes.",
    durationMonths: 12,
    monthlyPrice: 30000,
    onlinePrice: 500000,
    hybridPrice: 800000,
    availableModes: ["online", "hybrid"],
  },
  {
    title: "Marketing Digital & E-Commerce",
    slug: "marketing-digital-ecommerce",
    category: "Business",
    description: "Growth, acquisition client, e-commerce et stratégie digitale.",
    durationMonths: 12,
    monthlyPrice: 30000,
    onlinePrice: 500000,
    hybridPrice: 800000,
    availableModes: ["online", "hybrid"],
  },
  {
    title: "Blockchain & Web3",
    slug: "blockchain-web3",
    category: "Web3",
    description: "Smart contracts, systèmes décentralisés et usages Web3.",
    durationMonths: 12,
    monthlyPrice: 30000,
    onlinePrice: 500000,
    hybridPrice: 800000,
    availableModes: ["online", "hybrid"],
  },
  {
    title: "IoT & Robotique",
    slug: "iot-robotique",
    category: "Innovation",
    description: "Objets connectés, automatisation, systèmes embarqués et robotique.",
    durationMonths: 12,
    monthlyPrice: 30000,
    onlinePrice: 500000,
    hybridPrice: 800000,
    availableModes: ["online", "hybrid"],
  },
  {
    title: "Game Development",
    slug: "game-development",
    category: "Création",
    description: "Création de jeux vidéo, expériences interactives et moteurs de jeu.",
    durationMonths: 12,
    monthlyPrice: 30000,
    onlinePrice: 500000,
    hybridPrice: 800000,
    availableModes: ["online", "hybrid"],
  },
];

const fieldsEqual = (existing: any, incoming: (typeof SOURCE_CATALOG)[number]): boolean => {
  return (
    existing.title === incoming.title &&
    existing.category === incoming.category &&
    existing.description === incoming.description &&
    existing.durationMonths === incoming.durationMonths &&
    existing.monthlyPrice === incoming.monthlyPrice &&
    existing.onlinePrice === incoming.onlinePrice &&
    existing.hybridPrice === incoming.hybridPrice
  );
};

export const seedAcademyPrograms = async () => {
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;

  for (let i = 0; i < SOURCE_CATALOG.length; i++) {
    const entry = SOURCE_CATALOG[i];

    try {
      const existing = await AcademyProgram.findOne({ slug: entry.slug });

      if (!existing) {
        await AcademyProgram.create({ ...entry, displayOrder: i, isActive: true });
        created++;
        continue;
      }

      if (fieldsEqual(existing, entry)) {
        unchanged++;
        continue;
      }

      await AcademyProgram.updateOne(
        { _id: existing._id },
        {
          $set: {
            title: entry.title,
            category: entry.category,
            description: entry.description,
            durationMonths: entry.durationMonths,
            monthlyPrice: entry.monthlyPrice,
            onlinePrice: entry.onlinePrice,
            hybridPrice: entry.hybridPrice,
            availableModes: entry.availableModes,
          },
        }
      );
      updated++;
    } catch (err) {
      console.error(`⚠️  Programme ignoré (${entry.slug}) :`, err);
      skipped++;
    }
  }

  return { created, updated, unchanged, skipped, total: SOURCE_CATALOG.length };
};

// Exécution directe (npx ts-node src/scripts/seedAcademyPrograms.ts) — pas
// d'exécution automatique au démarrage de l'application.
if (require.main === module) {
  (async () => {
    await connectMongo();

    const result = await seedAcademyPrograms();

    console.log("📦 Migration catalogue Academy → MongoDB :");
    console.log(`   Créés     : ${result.created}`);
    console.log(`   Modifiés  : ${result.updated}`);
    console.log(`   Inchangés : ${result.unchanged}`);
    console.log(`   Ignorés   : ${result.skipped}`);
    console.log(`   Total     : ${result.total}`);

    await mongoose.disconnect();
    process.exit(0);
  })().catch((err) => {
    console.error("❌ Échec de la migration :", err);
    process.exit(1);
  });
}
