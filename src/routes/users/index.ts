import { Router, Request, Response } from "express";
import { SupplierModel } from "../../models/supplier";

const router = Router();

// Créer un Supplier (upgrade Customer -> Supplier)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, companyName, contact, region } = req.body;

    const newSupplier = new SupplierModel({ userId, companyName, contact, region });
    await newSupplier.save();

    res.status(201).json({ message: "Supplier créé avec succès", supplier: newSupplier });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

// Récupérer tous les Suppliers
router.get("/", async (_req: Request, res: Response) => {
  try {
    const suppliers = await SupplierModel.find().populate("userId");
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

export default router;
