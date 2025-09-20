import { Router, Request, Response } from "express";
import { AdminModel } from "../../../models/admin";

const router = Router();

// Créer un Admin (upgrade User -> Admin)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;

    const newAdmin = new AdminModel({ userId, role });
    await newAdmin.save();

    res.status(201).json({ message: "Admin créé avec succès", admin: newAdmin });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

// Récupérer tous les Admins
router.get("/", async (_req: Request, res: Response) => {
  try {
    const admins = await AdminModel.find().populate("userId");
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

export default router;
