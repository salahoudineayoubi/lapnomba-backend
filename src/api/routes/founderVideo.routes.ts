import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { isAuth } from "../../middlewares/isAuth";
import {
  getFounderHistoryVideo,
  upsertFounderHistoryVideo,
} from "../../models/founderHistoryVideo";
import {
  validateUploadedBuffer,
  detectVideoSignature,
  FileValidationError,
} from "../../utils/fileValidation";
import logger from "../../utils/logger";

const router = Router();

const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/webm"];
const MAX_VIDEO_BYTES = 250 * 1024 * 1024; // 250 Mo

// Buffer en mémoire : nécessaire pour valider la signature binaire réelle
// avant d'écrire quoi que ce soit sur disque.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES },
});

const VIDEOS_DIR = path.join(process.cwd(), "public", "uploads", "videos");

const ensureVideosDir = () => {
  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }
};

/**
 * Supprime l'ancien fichier vidéo local s'il existe, en se basant
 * uniquement sur le nom de fichier après "/uploads/videos/" (jamais un
 * chemin arbitraire) — indépendant du domaine utilisé pour l'URL, qui peut
 * changer selon APP_BASE_URL au fil du temps.
 */
const deleteOldVideoFile = (url?: string | null) => {
  if (!url || !url.includes("/uploads/videos/")) return;

  const fileName = url.split("/uploads/videos/").pop();
  if (!fileName) return;

  const filePath = path.join(VIDEOS_DIR, path.basename(fileName));
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      logger.error("Impossible de supprimer l'ancienne vidéo", { error: err.message });
    }
  });
};

/**
 * POST /api/founder-video/upload — ADMIN ONLY.
 * multipart/form-data: champ "lang" ("fr" | "en") + fichier "video".
 * Remplace la vidéo existante pour cette langue (ancien fichier supprimé).
 */
router.post("/upload", isAuth, upload.single("video"), async (req, res) => {
  try {
    const lang = (req.body?.lang || "").toLowerCase();

    if (lang !== "fr" && lang !== "en") {
      return res.status(400).json({ error: 'Le champ "lang" doit être "fr" ou "en".' });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Aucun fichier vidéo reçu." });
    }

    const detected = validateUploadedBuffer(req.file.buffer, {
      allowedMimes: ALLOWED_VIDEO_MIMES,
      maxBytes: MAX_VIDEO_BYTES,
      label: "Vidéo",
      detect: detectVideoSignature,
    });

    ensureVideosDir();

    const fileName = `founder-${lang}-${Date.now()}-${crypto.randomUUID()}.${detected.extension}`;
    const filePath = path.join(VIDEOS_DIR, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    // Dérivé de la requête entrante plutôt que d'APP_BASE_URL : si cette
    // requête a atteint le serveur, le domaine utilisé est nécessairement
    // valide — contrairement à une variable d'env qui peut pointer vers un
    // sous-domaine jamais configuré en DNS (ex: api.lapnomba.org).
    const requestBaseUrl = `${req.protocol}://${req.get("host")}`;
    const videoUrl = `${requestBaseUrl}/uploads/videos/${fileName}`;

    const existing = await getFounderHistoryVideo();
    const previousUrl = lang === "fr" ? existing?.videoFr : existing?.videoEn;

    await upsertFounderHistoryVideo(lang === "fr" ? { videoFr: videoUrl } : { videoEn: videoUrl });

    // Nettoyage de l'ancien fichier une fois le nouveau bien enregistré.
    deleteOldVideoFile(previousUrl);

    return res.status(200).json({ success: true, lang, url: videoUrl });
  } catch (error: any) {
    if (error instanceof FileValidationError) {
      return res.status(400).json({ error: error.message });
    }

    logger.error("Erreur lors de l'upload de la vidéo fondateur", {
      error: error instanceof Error ? error.message : error,
    });
    return res.status(500).json({ error: "Erreur lors de l'upload de la vidéo." });
  }
});

export default router;
