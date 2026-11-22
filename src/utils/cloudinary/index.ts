import dotenv from "dotenv";
dotenv.config();

import cloudinary from "cloudinary";
import streamifier from "streamifier";
import {
  cloudinaryLikelyDown,
  isCloudinaryUnavailable,
  isLocalPublicId,
  markCloudinaryDown,
  markCloudinaryUp,
  publicMediaUrl,
  removeLocal,
  storeLocally,
} from "../../services/mediaFallback";

const masked = (v?: string) => v ? (v.length > 6 ? v.slice(0,3) + "..."+ v.slice(-3) : "*****") : "<missing>";

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error("Cloudinary env vars missing:", {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "<missing>",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? masked(process.env.CLOUDINARY_API_KEY) : "<missing>",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? masked(process.env.CLOUDINARY_API_SECRET) : "<missing>",
  });
  throw new Error("Missing Cloudinary configuration in environment. Check .env");
}

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Envoi d'une image publique. Si Cloudinary est indisponible (compte suspendu, panne),
 * le fichier est gardé dans notre base et servi par le backend (/media/…), puis
 * transféré automatiquement vers Cloudinary dès son retour (services/mediaFallback).
 */
export async function uploadFromBase64(
  dataUri: string,
  options: { folder?: string; resource_type?: "image" | "raw" | "auto" } = {}
): Promise<{ secure_url: string; public_id: string; fallback?: boolean; [k: string]: any }> {
  const uploadOptions: any = {
    resource_type: options.resource_type || "auto",
    folder: options.folder,
  };
  const canFallback = typeof dataUri === "string" && dataUri.startsWith("data:");
  if (!(canFallback && cloudinaryLikelyDown())) {
    try {
      const res = await cloudinary.v2.uploader.upload(dataUri, uploadOptions);
      markCloudinaryUp();
      return res;
    } catch (err) {
      if (!canFallback || !isCloudinaryUnavailable(err)) throw err;
      console.error("[cloudinary] envoi refusé, passage au stockage de secours :", (err as any)?.message || err);
      markCloudinaryDown();
    }
  }
  const stored = await storeLocally(dataUri, {
    visibility: "public",
    resourceType: options.resource_type === "raw" ? "raw" : "image",
    folder: options.folder,
  });
  return { secure_url: publicMediaUrl(stored.id, stored.ext), public_id: stored.publicId, fallback: true };
}

export async function uploadBuffer(
  buffer: Buffer,
  filename = "file",
  options: { folder?: string; resource_type?: "image" | "raw" | "auto" } = {}
) {
  return new Promise<any>((resolve, reject) => {
    const uploadOptions: any = {
      resource_type: options.resource_type || "auto",
      folder: options.folder,
      public_id: filename.replace(/\.[^/.]+$/, ""),
    };
    const uploadStream = cloudinary.v2.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

export function generateSignature(paramsToSign: Record<string, any> = {}) {
  const timestamp = Math.round(Date.now() / 1000);
  const params = { ...paramsToSign, timestamp };
  const signature = cloudinary.v2.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET || "");
  return {
    timestamp,
    signature,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  };
}

/** Supprime une image publique (upload standard) ; sans effet si publicId est vide. */
export async function deleteImage(publicId?: string | null) {
  if (!publicId) return;
  if (isLocalPublicId(publicId)) {
    const doc = await removeLocal(publicId);
    if (doc?.migratedPublicId) await cloudinary.v2.uploader.destroy(doc.migratedPublicId, { resource_type: "image", invalidate: true });
    return;
  }
  await cloudinary.v2.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}
