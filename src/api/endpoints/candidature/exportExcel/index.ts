import { Router } from "express";
import Candidature from "../../../../models/candidature";
import XLSX from "xlsx";
import { isAuth } from "../../../../middlewares/isAuth";
import logger from "../../../../utils/logger";

const router = Router();

// ADMIN ONLY — même vérification JWT que le reste de l'API (voir utils/auth.ts).
router.get("/export-candidatures", isAuth, async (req, res) => {
  try {
    // Exclut les candidatures supprimées (soft-delete).
    let candidatures = await Candidature.find({ deletedAt: null }).lean();

    // Supprime ou tronque les champs trop longs (ex: photo, cv)
    candidatures = candidatures.map(c => {
      // On retire les champs base64 ou trop volumineux
      const { photo, cv, statusHistory, ...rest } = c as any;
      return rest;
      // Si tu veux garder un aperçu, tu peux faire :
      // return { ...rest, photo: photo?.slice(0, 100) || undefined, cv: cv?.slice(0, 100) || undefined };
    });

    const worksheet = XLSX.utils.json_to_sheet(candidatures);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidatures");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=candidatures.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    logger.error("Erreur lors de l'export Excel", { error: err instanceof Error ? err.message : err });
    res.status(500).json({ error: "Erreur lors de l'export Excel", details: err instanceof Error ? err.message : err });
  }
});

export default router;