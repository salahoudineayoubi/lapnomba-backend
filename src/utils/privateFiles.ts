/**
 * Fichiers PRIVÉS (pièces d'identité, selfies, CV des candidatures v2).
 *
 * Stockés sur Cloudinary en mode « authenticated » : aucune URL publique.
 * La base ne garde qu'une référence opaque « private:<resource_type>:<format>:<public_id> » ;
 * l'admin obtient un lien de téléchargement signé qui expire (getPrivateFileUrl).
 */
import crypto from "crypto";
import axios from "axios";
import type { Request, Response } from "express";
import cloudinary from "cloudinary";
import "./cloudinary"; // configure le SDK (variables d'environnement)
import {
  cloudinaryLikelyDown,
  isCloudinaryUnavailable,
  isLocalPublicId,
  localIdOf,
  markCloudinaryDown,
  markCloudinaryUp,
  publicBase,
  removeLocal,
  storeLocally,
} from "../services/mediaFallback";
import { StoredFileModel } from "../models/storedFile";

const PREFIX = "private:";

export type PrivateResourceType = "image" | "raw";

export const isPrivateRef = (value?: string | null): value is string =>
  typeof value === "string" && value.startsWith(PREFIX);

const parseRef = (ref: string) => {
  const [, resourceType, format, ...rest] = ref.split(":");
  return { resourceType: resourceType as PrivateResourceType, format, publicId: rest.join(":") };
};

/**
 * Si Cloudinary est indisponible, le fichier est gardé dans notre base (référence
 * « private:<type>:<format>:local/<id> ») et transféré vers Cloudinary à son retour.
 */
export const uploadPrivateDataUri = async (
  dataUri: string,
  { folder, resourceType, format }: { folder: string; resourceType: PrivateResourceType; format: string }
): Promise<string> => {
  if (!cloudinaryLikelyDown()) {
    try {
      const res = await cloudinary.v2.uploader.upload(dataUri, {
        type: "authenticated",
        resource_type: resourceType,
        folder,
        // Les images sont ré-encodées (métadonnées EXIF/GPS supprimées) ; un PDF reste tel quel.
        ...(resourceType === "image" ? { format, quality: "auto:good" } : {}),
        overwrite: false,
      });
      markCloudinaryUp();
      return `${PREFIX}${resourceType}:${format}:${res.public_id}`;
    } catch (err) {
      if (!isCloudinaryUnavailable(err)) throw err;
      console.error("[cloudinary] envoi privé refusé, passage au stockage de secours :", (err as any)?.message || err);
      markCloudinaryDown();
    }
  }
  const stored = await storeLocally(dataUri, { visibility: "private", resourceType, folder, format });
  return `${PREFIX}${resourceType}:${format}:${stored.publicId}`;
};

const cloudinaryDownloadUrl = (ref: string, ttlSeconds: number) => {
  const { resourceType, format, publicId } = parseRef(ref);
  return cloudinary.v2.utils.private_download_url(publicId, format, {
    resource_type: resourceType,
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
  });
};

const relaySecret = () => process.env.ADMISSIONS_SECRET || process.env.JWT_SECRET || "lapnomba-files";
// Même adresse que les images de secours (APP_BASE_URL pointe vers un domaine sans DNS).
const relayBase = () => publicBase();
const sign = (payload: string) => crypto.createHmac("sha256", relaySecret()).update(`file:${payload}`).digest("base64url");

/**
 * Lien à durée de vie courte (défaut 10 min) — à ne servir qu'à un admin authentifié.
 * Il passe par le serveur (/files/private/…) qui renvoie le fichier « en ligne » :
 * PDF et images s'affichent dans la visionneuse de l'admin au lieu d'être téléchargés.
 */
export const getPrivateFileUrl = (ref: string, ttlSeconds = 600): string => {
  const payload = Buffer.from(JSON.stringify({ r: ref, e: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  return `${relayBase()}/files/private/${payload}.${sign(payload)}`;
};

const MIME: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

/** Route Express GET /files/private/:token — vérifie la signature et l'expiration, puis relaie le fichier. */
export const servePrivateFile = async (req: Request, res: Response) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const [payload, sig] = String(req.params.token || "").split(".");
  const expected = payload ? sign(payload) : "";
  if (!payload || !sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(403).type("text/plain").send("Lien invalide.");
  }
  let data: { r: string; e: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return res.status(403).type("text/plain").send("Lien invalide.");
  }
  if (!isPrivateRef(data.r) || data.e < Math.floor(Date.now() / 1000)) {
    return res.status(410).type("text/plain").send("Lien expiré : rouvrez le document depuis l'admin.");
  }
  try {
    const { format: fmt, publicId } = parseRef(data.r);
    let upstreamRef = data.r;
    if (isLocalPublicId(publicId)) {
      // Fichier du stockage de secours : servi depuis la base, ou depuis Cloudinary s'il y a été transféré.
      const doc = await StoredFileModel.findById(localIdOf(publicId));
      if (!doc || doc.visibility !== "private") return res.status(404).type("text/plain").send("Fichier introuvable.");
      if (!doc.migratedPublicId) {
        if (!doc.data) return res.status(404).type("text/plain").send("Fichier introuvable.");
        res.setHeader("Content-Type", MIME[fmt] || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="document.${fmt}"`);
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        return res.send(doc.data);
      }
      upstreamRef = `${PREFIX}${doc.resourceType}:${fmt}:${doc.migratedPublicId}`;
    }
    const upstream = await axios.get<NodeJS.ReadableStream>(cloudinaryDownloadUrl(upstreamRef, 120), { responseType: "stream", timeout: 20000 });
    const { format } = parseRef(data.r);
    res.setHeader("Content-Type", MIME[format] || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="document.${format}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    upstream.data.pipe(res);
  } catch {
    res.status(404).type("text/plain").send("Fichier introuvable.");
  }
};

export const deletePrivateFile = async (ref?: string | null): Promise<void> => {
  if (!isPrivateRef(ref)) return;
  const { resourceType, publicId: parsedId } = parseRef(ref);
  let publicId = parsedId;
  if (isLocalPublicId(parsedId)) {
    const doc = await removeLocal(parsedId);
    if (!doc?.migratedPublicId) return;
    publicId = doc.migratedPublicId;
  }
  await cloudinary.v2.uploader.destroy(publicId, { type: "authenticated", resource_type: resourceType, invalidate: true });
};
