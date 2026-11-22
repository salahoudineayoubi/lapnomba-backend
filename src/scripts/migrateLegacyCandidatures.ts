/**
 * Bascule des anciennes candidatures (formulaire v1) vers le nouveau parcours d'admission (v2).
 *
 * Pour chaque adresse e-mail ayant une ancienne candidature active :
 *  - 16 à 25 ans (ou âge inconnu) : e-mail « reprenez votre candidature ». Une session v2 est
 *    préparée avec les informations déjà connues (nom, date de naissance, ville, WhatsApp,
 *    parcours…) : après la vérification de son e-mail, le candidat retrouve son dossier pré-rempli.
 *  - plus de 25 ans : e-mail d'orientation vers Lap Nomba Academy.
 *  - moins de 16 ans : aucune action (signalé dans le rapport).
 * Une fois l'e-mail envoyé, les anciennes candidatures de cette adresse sont archivées
 * (suppression logique : deletedAt / deletedBy = "migration-v2"). Rien n'est effacé physiquement.
 * L'archivage libère l'adresse : le nouveau parcours refuse une adresse qui a déjà une candidature active.
 *
 * Par défaut le script NE FAIT RIEN : il affiche seulement le bilan (simulation).
 *
 * Usage :
 *   npm run migrate:legacy-candidatures                        # simulation (aucun e-mail, aucune écriture)
 *   npm run migrate:legacy-candidatures -- --send --limit 20   # envoie aux 20 premières adresses
 *   npm run migrate:legacy-candidatures -- --send              # envoie à toutes les adresses restantes
 * Options :
 *   --statuses "en attente,refusée"  statuts concernés (défaut : "en attente" ; les approuvés ne sont jamais touchés
 *                                    sauf s'ils sont listés explicitement)
 *   --delay 3000                     pause entre deux e-mails, en ms (défaut 3000, pour le serveur SMTP)
 * Le script peut être relancé sans risque : une adresse déjà traitée n'a plus de candidature active.
 */
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { connectMongo } from "../data-source";

import Candidature from "../models/candidature";
import { ApplicationSession } from "../models/applicationSession";
import { sendMail } from "../utils/sendMail";
import { calculateAge, FREE_TRAINING_MAX_AGE, MIN_APPLICATION_AGE } from "../utils/ageEligibility";

const ADMISSIONS_URL = (process.env.ADMISSIONS_APP_URL || "https://admissions.lapnomba.org").replace(/\/+$/, "");
const ACADEMY_URL = "https://academy.lapnomba.org";
export const MIGRATION_TAG = "migration-v2";

export type MigrationGroup = "youth" | "academy" | "too_young";

/** Date de naissance des anciens formulaires : AAAA-MM-JJ, JJ/MM/AAAA, JJ-MM-AAAA ou AAAA/MM/JJ. */
export const parseLegacyBirthDate = (raw: unknown): Date | null => {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  let y: number, m: number, d: number;
  let r = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (r) [y, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else if ((r = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s))) [d, m, y] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  if (date > new Date() || y < 1900) return null;
  return date;
};

export const groupForAge = (age: number | null): MigrationGroup => {
  if (age === null) return "youth"; // âge inconnu : le nouveau parcours revérifiera l'âge
  if (age > FREE_TRAINING_MAX_AGE) return "academy";
  if (age < MIN_APPLICATION_AGE) return "too_young";
  return "youth";
};

const NIVEAUX = ["En cours de 3e / collège", "BEPC", "CAP", "Probatoire", "Bac", "BTS", "HND", "Licence", "Master", "Doctorat", "Autre"];

/** Brouillon v2 ({ form, step }) pré-rempli avec ce que l'ancien formulaire connaissait déjà. */
export const draftFromLegacy = (c: any, birth: Date | null) => {
  const form: Record<string, string> = {};
  const put = (k: string, v: unknown) => {
    if (typeof v === "string" && v.trim()) form[k] = v.trim();
  };
  put("nomComplet", c.nomComplet);
  if (birth) form.dateNaissance = birth.toISOString().slice(0, 10);
  if (c.sexe === "Homme" || c.sexe === "Femme") form.sexe = c.sexe;
  if (typeof c.pays === "string" && /^[A-Z]{2}$/.test(c.pays.trim())) form.pays = c.pays.trim();
  put("ville", c.ville);
  put("numeroWhatsapp", c.numeroWhatsapp);
  if (NIVEAUX.includes(c.niveauScolaire)) form.niveauScolaire = c.niveauScolaire;
  put("filiere", c.filiere);
  put("ecole", c.ecole);
  return JSON.stringify({ form, step: 1 });
};

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const firstName = (full?: string) => {
  const parts = String(full || "").trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || "";
};

const button = (href: string, label: string) =>
  `<p style="margin:28px 0"><a href="${esc(href)}" style="background:#4143B7;color:#fff;text-decoration:none;padding:14px 26px;border-radius:8px;font-weight:bold;display:inline-block">${esc(label)}</a></p>`;

export const youthEmail = (email: string, name?: string) => {
  const link = `${ADMISSIONS_URL}/register?email=${encodeURIComponent(email)}`;
  const hello = name ? `Bonjour ${firstName(name)},` : "Bonjour,";
  const subject = "Lap Nomba Foundation : finalisez votre candidature sur la nouvelle plateforme";
  const text = [
    hello,
    "",
    "Vous aviez déposé une candidature à la Lap Nomba Foundation. Merci pour votre confiance !",
    "Nous avons ouvert une nouvelle plateforme d'admission, plus sûre et plus complète. Pour que votre candidature soit étudiée, il vous reste deux étapes :",
    "1. Vérifiez votre adresse e-mail (vous recevrez un code à 6 chiffres).",
    "2. Complétez votre dossier : vos informations déjà connues sont pré-remplies.",
    "",
    `Reprendre ma candidature : ${link}`,
    "",
    "La formation reste entièrement gratuite pour les jeunes de 16 à 25 ans.",
    "",
    "L'équipe Lap Nomba Foundation",
  ].join("\n");
  const html = `<h2 style="margin:0 0 16px">Finalisez votre candidature</h2>
<p>${esc(hello)}</p>
<p>Vous aviez déposé une candidature à la Lap Nomba Foundation. Merci pour votre confiance !</p>
<p>Nous avons ouvert une <strong>nouvelle plateforme d'admission</strong>, plus sûre et plus complète. Pour que votre candidature soit étudiée, il vous reste deux étapes :</p>
<ol>
<li><strong>Vérifiez votre adresse e-mail</strong> : vous recevrez un code à 6 chiffres.</li>
<li><strong>Complétez votre dossier</strong> : vos informations déjà connues sont pré-remplies.</li>
</ol>
${button(link, "Reprendre ma candidature")}
<p>La formation reste <strong>entièrement gratuite</strong> pour les jeunes de 16 à 25 ans.</p>
<p>L'équipe Lap Nomba Foundation</p>`;
  return { subject, text, html };
};

export const academyEmail = (name?: string) => {
  const hello = name ? `Bonjour ${firstName(name)},` : "Bonjour,";
  const subject = "Lap Nomba : une formation adaptée à votre profil avec Lap Nomba Academy";
  const text = [
    hello,
    "",
    "Vous aviez déposé une candidature à la Lap Nomba Foundation. Merci pour votre intérêt !",
    "Les formations gratuites de la Fondation sont réservées aux jeunes de 16 à 25 ans. Pour vous accompagner malgré tout vers les métiers du numérique, nous vous invitons à découvrir Lap Nomba Academy : des formations complètes de 12 mois (développement web et mobile, data et IA, cybersécurité, cloud, design UX/UI…), avec des projets concrets et un accompagnement vers l'emploi.",
    "Les revenus de l'Academy financent les formations gratuites des plus jeunes.",
    "",
    `Découvrir Lap Nomba Academy : ${ACADEMY_URL}`,
    "",
    "L'équipe Lap Nomba",
  ].join("\n");
  const html = `<h2 style="margin:0 0 16px">Une formation adaptée à votre profil</h2>
<p>${esc(hello)}</p>
<p>Vous aviez déposé une candidature à la Lap Nomba Foundation. Merci pour votre intérêt !</p>
<p>Les formations gratuites de la Fondation sont réservées aux jeunes de <strong>16 à 25 ans</strong>. Pour vous accompagner malgré tout vers les métiers du numérique, nous vous invitons à découvrir <strong>Lap Nomba Academy</strong> : des formations complètes de 12 mois (développement web et mobile, data et IA, cybersécurité, cloud, design UX/UI…), avec des projets concrets et un accompagnement vers l'emploi.</p>
<p>Les revenus de l'Academy financent les formations gratuites des plus jeunes.</p>
${button(ACADEMY_URL, "Découvrir Lap Nomba Academy")}
<p>L'équipe Lap Nomba</p>`;
  return { subject, text, html };
};

const maskEmail = (e: string) => e.replace(/^(.{2}).*(@.*)$/, "$1***$2");
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const run = async () => {
  const send = process.argv.includes("--send");
  const limit = Number(arg("--limit") || 0) || Infinity;
  const delay = Number(arg("--delay") || 3000);
  const statuses = (arg("--statuses") || "en attente").split(",").map((s) => s.trim()).filter(Boolean);

  const legacy: any[] = await Candidature.find({
    deletedAt: null,
    $or: [{ applicationVersion: { $exists: false } }, { applicationVersion: null }, { applicationVersion: { $lt: 2 } }],
  })
    .sort({ createdAt: -1 })
    .lean();

  // Une adresse qui a déjà une candidature v2 active n'est jamais touchée.
  const v2Emails = new Set(
    (await Candidature.find({ deletedAt: null, applicationVersion: { $gte: 2 } }, { email: 1 }).lean()).map((c: any) =>
      String(c.email).toLowerCase().trim()
    )
  );

  const byEmail = new Map<string, any[]>();
  for (const c of legacy) {
    const e = String(c.email || "").toLowerCase().trim();
    if (!e) continue;
    byEmail.set(e, [...(byEmail.get(e) || []), c]);
  }

  const counts: Record<string, number> = { youth: 0, academy: 0, too_young: 0, skipped_status: 0, skipped_v2: 0, unknown_age: 0, sent: 0, failed: 0 };
  const statusCounts: Record<string, number> = {};
  for (const c of legacy) statusCounts[c.statut] = (statusCounts[c.statut] || 0) + 1;

  let processed = 0;
  for (const [email, list] of byEmail) {
    if (v2Emails.has(email)) {
      counts.skipped_v2++;
      continue;
    }
    // Toutes les candidatures de l'adresse doivent avoir un statut concerné (un approuvé bloque l'adresse).
    if (!list.every((c) => statuses.includes(c.statut))) {
      counts.skipped_status++;
      continue;
    }
    const latest = list[0];
    const birth = parseLegacyBirthDate(latest.dateNaissance);
    const age = birth ? calculateAge(birth) : null;
    if (age === null) counts.unknown_age++;
    const group = groupForAge(age);
    counts[group]++;
    if (group === "too_young" || !send || processed >= limit) continue;
    processed++;

    try {
      if (group === "youth") {
        const open = await ApplicationSession.findOne({ email, submittedCandidatureId: { $exists: false } }).sort({ createdAt: -1 });
        if (!open) await ApplicationSession.create({ email, draft: draftFromLegacy(latest, birth) });
        else if (!open.draft) {
          open.draft = draftFromLegacy(latest, birth);
          await open.save();
        }
        await sendMail({ to: email, ...youthEmail(email, latest.nomComplet) });
      } else {
        await sendMail({ to: email, ...academyEmail(latest.nomComplet) });
      }
      await Candidature.updateMany(
        { _id: { $in: list.map((c) => c._id) }, deletedAt: null },
        { $set: { deletedAt: new Date(), deletedBy: MIGRATION_TAG } }
      );
      counts.sent++;
      console.log(`✓ ${group.padEnd(8)} ${maskEmail(email)} (${list.length} ancienne(s) candidature(s) archivée(s))`);
    } catch (err) {
      counts.failed++;
      console.error(`✗ ${maskEmail(email)} : ${err instanceof Error ? err.message : err}`);
    }
    await sleep(delay);
  }

  console.log("\n=== Bilan ===");
  console.log(`Mode : ${send ? `ENVOI (limite ${limit === Infinity ? "aucune" : limit})` : "SIMULATION — rien n'est envoyé ni modifié"}`);
  console.log(`Statuts concernés : ${statuses.join(", ")}`);
  console.log(`Anciennes candidatures actives : ${legacy.length} — par statut :`, statusCounts);
  console.log(`Adresses e-mail distinctes : ${byEmail.size}`);
  console.log(`  16-25 ans (ou âge inconnu) → reprise de candidature : ${counts.youth} (dont âge illisible : ${counts.unknown_age})`);
  console.log(`  plus de 25 ans → Lap Nomba Academy : ${counts.academy}`);
  console.log(`  moins de 16 ans → aucune action : ${counts.too_young}`);
  console.log(`  ignorées (statut non concerné, ex. approuvé) : ${counts.skipped_status}`);
  console.log(`  ignorées (déjà une candidature sur le nouveau parcours) : ${counts.skipped_v2}`);
  if (send) console.log(`E-mails envoyés : ${counts.sent} — échecs : ${counts.failed}`);
  return counts;
};

if (require.main === module) {
  (async () => {
    await connectMongo();
    await run();
    await mongoose.disconnect();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
