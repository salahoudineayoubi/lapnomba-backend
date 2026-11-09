/**
 * Traduit (fr / en / tr / ar) les collectes existantes.
 *
 * - Par défaut : SIMULATION (dry-run) — liste les collectes à traduire, aucun
 *   appel à l'API de traduction, aucune écriture.
 * - `--apply` : traduit et enregistre (une collecte à la fois).
 * - `--force` : retraduit aussi les collectes déjà traduites (écrase les
 *   corrections manuelles de l'équipe : à utiliser avec prudence).
 * - `--slug=<slug>` : limite à une collecte.
 *
 * Nécessite OPENAI_API_KEY (même variable que le chatbot) pour `--apply`.
 *
 * Usage : npx ts-node src/scripts/translateCampaigns.ts [--apply] [--force] [--slug=...]
 */

import "dotenv/config";
import mongoose from "mongoose";
import { connectMongo } from "../data-source";
import { CrowdfundingCampaignModel } from "../models/crowdfunding_campaign";
import { computeSourceHash, isTranslationEnabled, translateCampaign } from "../services/campaignTranslation";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const force = args.includes("--force");
const slugArg = args.find((a) => a.startsWith("--slug="))?.slice("--slug=".length);

async function main() {
  if (apply && !isTranslationEnabled()) {
    console.error("OPENAI_API_KEY n'est pas configurée : impossible de traduire (--apply).");
    process.exit(1);
  }

  await connectMongo();

  const campaigns = await CrowdfundingCampaignModel.find(slugArg ? { slug: slugArg } : {})
    .select("title story slug translationSourceHash translationError")
    .sort({ createdAt: -1 });

  const todo = campaigns.filter(
    (c) => force || c.translationSourceHash !== computeSourceHash(c.title, c.story) || !!c.translationError
  );

  console.log(`${campaigns.length} collecte(s), ${todo.length} à traduire${apply ? "" : " (simulation, ajoutez --apply)"}.`);

  const summary: Record<string, number> = {};
  for (const c of todo) {
    if (!apply) {
      console.log(`  - ${c.slug}`);
      continue;
    }
    const status = await translateCampaign(String(c._id), { force: true });
    summary[status] = (summary[status] || 0) + 1;
    console.log(`  - ${c.slug} : ${status}`);
  }

  if (apply) console.log("Résultat :", summary);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
