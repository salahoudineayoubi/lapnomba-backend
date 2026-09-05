/**
 * Validation de fichiers uploadés (base64 / data URI).
 *
 * On ne fait confiance ni à l'extension, ni au `Content-Type` déclaré par le
 * client : le type réel est détecté à partir des premiers octets du fichier
 * ("magic bytes"), puis comparé à une liste blanche.
 */

export class FileValidationError extends Error {}

export interface DetectedFile {
  mime: string;
  extension: string;
}

/**
 * Détecte le type réel d'un buffer à partir de sa signature binaire.
 * Retourne `null` si le format n'est pas reconnu.
 */
export const detectFileSignature = (buffer: Buffer): DetectedFile | null => {
  if (buffer.length < 4) return null;

  // PDF: "%PDF"
  if (buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return { mime: "application/pdf", extension: "pdf" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", extension: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", extension: "png" };
  }

  // WEBP: "RIFF"....'WEBP'
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", extension: "webp" };
  }

  // DOC (legacy, OLE Compound File): D0 CF 11 E0 A1 B1 1A E1
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    return { mime: "application/msword", extension: "doc" };
  }

  // DOCX (ZIP-based OOXML): PK\x03\x04
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return {
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: "docx",
    };
  }

  return null;
};

/**
 * Détecte un conteneur vidéo à partir de sa signature binaire (MP4/MOV via
 * la box "ftyp", WebM via son en-tête EBML). Séparé de `detectFileSignature`
 * — les vidéos sont validées à partir d'un Buffer déjà en mémoire (upload
 * multipart), pas d'une data URI.
 */
export const detectVideoSignature = (buffer: Buffer): DetectedFile | null => {
  if (buffer.length < 12) return null;

  // MP4 / MOV / M4V : box "ftyp" à l'offset 4.
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    return { mime: "video/mp4", extension: "mp4" };
  }

  // WebM (Matroska) : en-tête EBML 1A 45 DF A3.
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { mime: "video/webm", extension: "webm" };
  }

  return null;
};

/**
 * Valide un Buffer déjà en mémoire (upload multipart, ex: vidéo) contre une
 * liste de MIME autorisés et une taille maximale, à partir de la signature
 * binaire réelle. Lève une FileValidationError sinon.
 */
export const validateUploadedBuffer = (
  buffer: Buffer,
  {
    allowedMimes,
    maxBytes,
    label,
    detect = detectFileSignature,
  }: {
    allowedMimes: string[];
    maxBytes: number;
    label: string;
    detect?: (buffer: Buffer) => DetectedFile | null;
  }
): DetectedFile => {
  if (!buffer || buffer.length === 0) {
    throw new FileValidationError(`${label} : fichier vide.`);
  }

  if (buffer.length > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    throw new FileValidationError(`${label} : fichier trop volumineux (max ${maxMb} Mo).`);
  }

  const detected = detect(buffer);

  if (!detected || !allowedMimes.includes(detected.mime)) {
    throw new FileValidationError(
      `${label} : type de fichier non autorisé. Formats acceptés : ${allowedMimes.join(", ")}.`
    );
  }

  return detected;
};

/**
 * Parse une data URI ("data:<mime>;base64,<data>") en buffer décodé +
 * mime déclaré par le client (non fiable, à ne jamais utiliser seul).
 */
export const parseDataUri = (
  dataUri: string
): { declaredMime: string | null; buffer: Buffer } | null => {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUri.trim());

  if (!match) return null;

  const [, declaredMime, base64Data] = match;

  return { declaredMime, buffer: Buffer.from(base64Data, "base64") };
};

/**
 * Valide un fichier uploadé (data URI) contre une liste de MIME autorisés
 * et une taille maximale, en se basant sur la signature binaire réelle.
 * Lève une FileValidationError avec un message clair si invalide.
 */
export const validateUploadedFile = (
  dataUri: string,
  {
    allowedMimes,
    maxBytes,
    label,
  }: { allowedMimes: string[]; maxBytes: number; label: string }
): DetectedFile => {
  const parsed = parseDataUri(dataUri);

  if (!parsed) {
    throw new FileValidationError(`${label} : format de fichier invalide.`);
  }

  if (parsed.buffer.length === 0) {
    throw new FileValidationError(`${label} : fichier vide.`);
  }

  if (parsed.buffer.length > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    throw new FileValidationError(`${label} : fichier trop volumineux (max ${maxMb} Mo).`);
  }

  const detected = detectFileSignature(parsed.buffer);

  if (!detected || !allowedMimes.includes(detected.mime)) {
    throw new FileValidationError(
      `${label} : type de fichier non autorisé. Formats acceptés : ${allowedMimes.join(", ")}.`
    );
  }

  return detected;
};
