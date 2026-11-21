/**
 * Purge des pièces d'identité (minimisation des données personnelles).
 *
 * - Candidatures décidées (approuvée / refusée) depuis plus de 180 jours : suppression
 *   des fichiers privés (recto, verso, selfie, parent/tuteur, acte) ; on garde le statut
 *   de vérification, le type de pièce et les 4 derniers chiffres.
 * - Sessions jamais envoyées depuis plus de 55 jours : suppression de leurs fichiers
 *   (le document de session lui-même expire à 60 jours via l'index TTL).
 *
 * Usage : npm run purge:identity   (à planifier une fois par jour)
 */
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { connectMongo } from "../data-source";

import Candidature from "../models/candidature";
import { ApplicationSession } from "../models/applicationSession";
import { deletePrivateFile } from "../utils/privateFiles";

const DAY = 24 * 3600 * 1000;

export const purgeIdentityDocuments = async (now = new Date()) => {
  let candidatures = 0;
  let sessions = 0;

  const decidedBefore = new Date(now.getTime() - 180 * DAY);
  const decided = await Candidature.find({
    "identite.documents": { $exists: true },
    "identite.purgedAt": { $exists: false },
    statut: { $in: ["approuvée", "refusée"] },
    updatedAt: { $lt: decidedBefore },
  });
  for (const c of decided) {
    const last = [...(c.statusHistory || [])].reverse().find((h) => h.to === c.statut);
    if (last && new Date(last.changedAt) > decidedBefore) continue;
    const docs: Record<string, string | undefined> = (c.identite as any).documents || {};
    await Promise.all(Object.values(docs).map((ref) => deletePrivateFile(ref).catch(() => undefined)));
    (c.identite as any).documents = {};
    c.identite!.purgedAt = now;
    if (c.photo && c.photo.startsWith("private:")) c.photo = undefined;
    c.markModified("identite");
    await c.save();
    candidatures += 1;
  }

  const abandoned = await ApplicationSession.find({
    submittedCandidatureId: { $exists: false },
    createdAt: { $lt: new Date(now.getTime() - 55 * DAY) },
  });
  for (const s of abandoned) {
    const docs: Record<string, string | undefined> = (s.documents as any) || {};
    if (!Object.values(docs).some(Boolean)) continue;
    await Promise.all(Object.values(docs).map((ref) => deletePrivateFile(ref).catch(() => undefined)));
    s.documents = {};
    s.markModified("documents");
    await s.save();
    sessions += 1;
  }

  return { candidatures, sessions };
};

if (require.main === module) {
  (async () => {
    await connectMongo();
    const res = await purgeIdentityDocuments();
    console.log(`Purge terminée : ${res.candidatures} candidature(s), ${res.sessions} session(s) abandonnée(s).`);
    await mongoose.disconnect();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
