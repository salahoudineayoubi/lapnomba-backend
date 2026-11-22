/**
 * Retour automatique vers Cloudinary : toutes les 10 min, les fichiers du stockage de
 * secours sont renvoyés vers Cloudinary. Dès qu'un transfert réussit, les octets sont
 * effacés de notre base et /media/<id> redirige vers Cloudinary.
 * Si Cloudinary est encore indisponible, on s'arrête et on réessaie au tour suivant.
 */
import cloudinary from "cloudinary";
import "../../utils/cloudinary"; // configure le SDK
import { StoredFileModel } from "../../models/storedFile";
import { isCloudinaryUnavailable, markCloudinaryDown, markCloudinaryUp } from "./index";

const BATCH = 20;
const INTERVAL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 20;

export const migrateFallbackFiles = async (): Promise<{ migrated: number; pending: number; stopped: boolean }> => {
  const pendingFilter = { migratedAt: { $exists: false }, migrationAttempts: { $lt: MAX_ATTEMPTS } };
  const docs = await StoredFileModel.find(pendingFilter).sort({ createdAt: 1 }).limit(BATCH);
  let migrated = 0;
  let stopped = false;
  for (const doc of docs) {
    if (!doc.data) continue;
    const dataUri = `data:${doc.contentType};base64,${doc.data.toString("base64")}`;
    try {
      const res = await cloudinary.v2.uploader.upload(dataUri, {
        resource_type: doc.resourceType,
        folder: doc.folder,
        ...(doc.visibility === "private"
          ? { type: "authenticated", overwrite: false, ...(doc.resourceType === "image" ? { format: doc.ext, quality: "auto:good" } : {}) }
          : {}),
      });
      doc.migratedPublicId = res.public_id;
      if (doc.visibility === "public") doc.migratedUrl = res.secure_url;
      doc.migratedAt = new Date();
      doc.data = undefined;
      doc.lastError = undefined;
      await doc.save();
      markCloudinaryUp();
      migrated++;
    } catch (err: any) {
      doc.migrationAttempts = (doc.migrationAttempts || 0) + 1;
      doc.lastError = String(err?.message || err).slice(0, 300);
      await doc.save();
      if (isCloudinaryUnavailable(err)) {
        markCloudinaryDown();
        stopped = true;
        break;
      }
    }
  }
  const pending = await StoredFileModel.countDocuments(pendingFilter);
  if (migrated) console.log(`[media] ${migrated} fichier(s) transféré(s) vers Cloudinary, ${pending} restant(s).`);
  return { migrated, pending, stopped };
};

let timer: NodeJS.Timeout | null = null;
let running = false;

export const startFallbackMigrationLoop = () => {
  if (timer || process.env.NODE_ENV === "test") return;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      // Plusieurs lots d'affilée tant que tout passe.
      for (let i = 0; i < 10; i++) {
        const r = await migrateFallbackFiles();
        if (r.stopped || !r.migrated || !r.pending) break;
      }
    } catch (err: any) {
      console.error("[media] transfert vers Cloudinary :", err?.message || err);
    } finally {
      running = false;
    }
  };
  setTimeout(tick, 60 * 1000).unref();
  timer = setInterval(tick, INTERVAL_MS);
  timer.unref();
};
