import { Router, Request, Response } from "express";

const router = Router();

router.post("/", async (_req: Request, res: Response) => {
  try {
    // Ici, côté serveur, on ne fait rien de spécial
    // On renvoie juste un message de confirmation
    // Le client doit supprimer le token stocké
    res.json({ message: "Déconnexion réussie. Supprimez le token côté client." });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

export default router;
