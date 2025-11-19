import { Router } from "express";
import Candidature from "../../../../models/candidature";
import XLSX from "xlsx";

const router = Router();

router.get("/export-candidatures", async (req, res) => {
  try {
    let candidatures = await Candidature.find().lean();

    // Supprime ou tronque les champs trop longs (ex: photo, cv)
    candidatures = candidatures.map(c => {
      // On retire les champs base64 ou trop volumineux
      const { photo, cv, ...rest } = c;
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
    console.error("Erreur lors de l'export Excel :", err);
    res.status(500).json({ error: "Erreur lors de l'export Excel", details: err instanceof Error ? err.message : err });
  }
});

export default router;