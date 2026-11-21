/**
 * Fichiers PRIVÉS (pièces d'identité, selfies, CV des candidatures v2).
 *
 * Stockés sur Cloudinary en mode « authenticated » : aucune URL publique.
 * La base ne garde qu'une référence opaque « private:<resource_type>:<format>:<public_id> » ;
 * l'admin obtient un lien de téléchargement signé qui expire (getPrivateFileUrl).
 */
import cloudinary from "cloudinary";
import "./cloudinary"; // configure le SDK (variables d'environnement)

const PREFIX = "private:";

export type PrivateResourceType = "image" | "raw";

export const isPrivateRef = (value?: string | null): value is string =>
  typeof value === "string" && value.startsWith(PREFIX);

const parseRef = (ref: string) => {
  const [, resourceType, format, ...rest] = ref.split(":");
  return { resourceType: resourceType as PrivateResourceType, format, publicId: rest.join(":") };
};

export const uploadPrivateDataUri = async (
  dataUri: string,
  { folder, resourceType, format }: { folder: string; resourceType: PrivateResourceType; format: string }
): Promise<string> => {
  const res = await cloudinary.v2.uploader.upload(dataUri, {
    type: "authenticated",
    resource_type: resourceType,
    folder,
    // Les images sont ré-encodées (métadonnées EXIF/GPS supprimées) ; un PDF reste tel quel.
    ...(resourceType === "image" ? { format, quality: "auto:good" } : {}),
    overwrite: false,
  });
  return `${PREFIX}${resourceType}:${format}:${res.public_id}`;
};

/** Lien signé à durée de vie courte (défaut 10 min) — à ne servir qu'à un admin authentifié. */
export const getPrivateFileUrl = (ref: string, ttlSeconds = 600): string => {
  const { resourceType, format, publicId } = parseRef(ref);
  return cloudinary.v2.utils.private_download_url(publicId, format, {
    resource_type: resourceType,
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
  });
};

export const deletePrivateFile = async (ref?: string | null): Promise<void> => {
  if (!isPrivateRef(ref)) return;
  const { resourceType, publicId } = parseRef(ref);
  await cloudinary.v2.uploader.destroy(publicId, { type: "authenticated", resource_type: resourceType, invalidate: true });
};
