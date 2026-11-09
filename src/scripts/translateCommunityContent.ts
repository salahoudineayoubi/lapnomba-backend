/**
 * Traduit (IA) en FR/EN/TR/AR les avis de la communauté approuvés et les
 * témoignages déjà en base. Seules les langues vides sont remplies : les
 * traductions corrigées dans l'admin ne sont pas touchées.
 *
 * Usage : npm run translate:community   (nécessite OPENAI_API_KEY)
 */

import mongoose from "mongoose";
import { connectMongo } from "../data-source";
import { CommunityVoiceModel } from "../models/communityvoice";
import { TestimonialModel } from "../models/testimonial";
import { getTranslationClient } from "../services/campaignTranslation";
import { translateVoice } from "../api/endpoints/communityVoice/resolver";
import { translateTestimonial } from "../api/endpoints/testimonials/resolvers";

if (require.main === module) {
  (async () => {
    const client = getTranslationClient();
    if (!client) throw new Error("OPENAI_API_KEY absente : traduction impossible.");
    await connectMongo();

    const voices = await CommunityVoiceModel.find({ isApproved: true }).select("_id name");
    for (const v of voices) {
      await translateVoice(String(v._id), client);
      console.log(`✓ avis : ${v.name}`);
    }
    const testimonials = await TestimonialModel.find({ temoignage: { $exists: true, $ne: "" } }).select("_id nomComplet");
    for (const t of testimonials) {
      await translateTestimonial(String(t._id), client);
      console.log(`✓ témoignage : ${t.nomComplet}`);
    }

    console.log(`📦 ${voices.length} avis et ${testimonials.length} témoignage(s) traités.`);
    await mongoose.disconnect();
    process.exit(0);
  })().catch((err) => {
    console.error("❌ Échec :", err);
    process.exit(1);
  });
}
