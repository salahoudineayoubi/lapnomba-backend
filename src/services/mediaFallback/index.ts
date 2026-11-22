/**
 * Stockage de secours des fichiers quand Cloudinary est indisponible.
 *
 * 1. Un envoi échoue côté Cloudinary (compte suspendu, 401/403/5xx, réseau) :
 *    le fichier est gardé dans MongoDB et servi par notre backend (/media/<id>.<ext>).
 * 2. Pendant 5 min on ne retente pas Cloudinary (les envois restent rapides).
 * 3. Une tâche de fond (migrate.ts) renvoie ces fichiers vers Cloudinary dès qu'il
 *    répond : /media/<id> redirige alors vers Cloudinary, sans toucher aux fiches
 *    (leaders, témoignages, candidatures…) qui gardent la même adresse.
 */
import type { Request, Response } from "express";
import mongoose from "mongoose";
import { StoredFileModel } from "../../models/storedFile";

export const LOCAL_PREFIX = "local/";
const MAX_FALLBACK_BYTES = 12 * 1024 * 1024;
const COOL_DOWN_MS = 5 * 60 * 1000;

let cloudinaryDownUntil = 0;

export const markCloudinaryDown = () => {
  cloudinaryDownUntil = Date.now() + COOL_DOWN_MS;
};
export const markCloudinaryUp = () => {
  cloudinaryDownUntil = 0;
};
export const cloudinaryLikelyDown = () => Date.now() < cloudinaryDownUntil;

/**
 * Erreur « Cloudinary indisponible » (et non « fichier invalide ») :
 * compte désactivé, identifiants refusés, limite, panne serveur ou réseau.
 */
export const isCloudinaryUnavailable = (err: any): boolean => {
  const code = Number(err?.http_code ?? err?.error?.http_code ?? 0);
  const message = String(err?.message ?? err?.error?.message ?? "");
  if (/disabled|suspend|deactivat|blocked|quota|limit/i.test(message)) return true;
  if ([401, 403, 420, 429].includes(code) || code >= 500) return true;
  if (!code && /ENOTFOUND|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|timeout|socket hang up/i.test(message)) return true;
  return false;
};

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/** Images servies telles quelles ; le reste en pièce jointe (jamais de SVG/HTML en ligne). */
const INLINE_PUBLIC_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const parseDataUri = (dataUri: string): { mime: string; buffer: Buffer } | null => {
  const m = /^data:([a-z0-9.+/-]+)?(;[^,]*)?,/i.exec(dataUri || "");
  if (!m) return null;
  const mime = (m[1] || "application/octet-stream").toLowerCase();
  const isBase64 = /;base64/i.test(m[2] || "");
  const body = dataUri.slice(m[0].length);
  const buffer = isBase64 ? Buffer.from(body, "base64") : Buffer.from(decodeURIComponent(body), "utf8");
  return { mime, buffer };
};

const publicBase = () =>
  (process.env.APP_BASE_URL || "https://lobster-app-vdl5o.ondigitalocean.app").trim().replace(/\/+$/, "");

export const publicMediaUrl = (id: string, ext: string) => `${publicBase()}/media/${id}.${ext}`;

export const isLocalPublicId = (publicId?: string | null): publicId is string =>
  typeof publicId === "string" && publicId.startsWith(LOCAL_PREFIX);

export const localIdOf = (publicId: string) => publicId.slice(LOCAL_PREFIX.length);

/** Garde le fichier dans notre base. Lève une erreur claire si ce n'est pas possible. */
export const storeLocally = async (
  dataUri: string,
  opts: { visibility: "public" | "private"; resourceType: "image" | "raw"; folder?: string; format?: string }
) => {
  const parsed = parseDataUri(dataUri);
  if (!parsed || !parsed.buffer.length) {
    throw new Error("Le stockage des images est momentanément indisponible. Réessayez plus tard.");
  }
  if (parsed.buffer.length > MAX_FALLBACK_BYTES) {
    throw new Error("Fichier trop lourd pour le stockage de secours (12 Mo maximum).");
  }
  const ext = (opts.format || EXT_BY_MIME[parsed.mime] || "bin").toLowerCase();
  const doc = await StoredFileModel.create({
    visibility: opts.visibility,
    resourceType: opts.resourceType,
    contentType: parsed.mime,
    ext,
    folder: opts.folder,
    bytes: parsed.buffer.length,
    data: parsed.buffer,
  });
  console.warn(`[media] Cloudinary indisponible : fichier gardé dans la base (${doc.id}, ${opts.folder || "-"}, ${parsed.buffer.length} o).`);
  return { id: String(doc._id), ext, publicId: `${LOCAL_PREFIX}${doc._id}` };
};

export const removeLocal = async (publicId: string) => {
  const id = localIdOf(publicId);
  if (!mongoose.isValidObjectId(id)) return null;
  return StoredFileModel.findByIdAndDelete(id);
};

/** GET /media/:file — fichiers PUBLICS du stockage de secours (ou redirection après transfert). */
export const serveMedia = async (req: Request, res: Response) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  const id = String(req.params.file || "").replace(/\.[a-z0-9]+$/i, "");
  if (!mongoose.isValidObjectId(id)) return res.status(404).type("text/plain").send("Fichier introuvable.");
  try {
    const doc = await StoredFileModel.findById(id);
    if (!doc || doc.visibility !== "public") return res.status(404).type("text/plain").send("Fichier introuvable.");
    if (doc.migratedUrl) {
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.redirect(301, doc.migratedUrl);
    }
    if (!doc.data) return res.status(404).type("text/plain").send("Fichier introuvable.");
    const inline = INLINE_PUBLIC_MIMES.has(doc.contentType);
    res.setHeader("Content-Type", inline ? doc.contentType : "application/octet-stream");
    res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${id}.${doc.ext}"`);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(doc.data);
  } catch {
    return res.status(500).type("text/plain").send("Erreur.");
  }
};
