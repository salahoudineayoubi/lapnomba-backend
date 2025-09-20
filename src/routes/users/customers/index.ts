import { Router, Request, Response } from "express";
import { CustomerModel } from "../../../models/customer";

const router = Router();

// Récupérer tous les customers
router.get("/", async (_req: Request, res: Response) => {
  try {
    const customers = await CustomerModel.find().populate("userId");
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

// Récupérer un customer par ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const customer = await CustomerModel.findById(req.params.id).populate("userId");
    if (!customer) return res.status(404).json({ message: "Customer introuvable" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

// Supprimer un customer
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await CustomerModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Customer introuvable" });
    }
    res.json({ message: "Customer supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

export default router;