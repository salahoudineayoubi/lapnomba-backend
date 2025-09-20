import { Router, Request, Response } from "express";
import { SupplierModel } from "../../../models/supplier";
import { UserModel } from "../../../models/user";

const router = Router();

// Créer un Supplier (upgrade Customer -> Supplier)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, companyName, contact, region, phone } = req.body;

    // Vérifie que le numéro est fourni et turc
    if (!phone || phone.countryCode !== "tr") {
      return res.status(400).json({ message: "Un numéro turc est obligatoire pour devenir supplier." });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Ajoute ou remplace le numéro
    user.phone = phone;

    // Ajoute le rôle
    if (!user.roles.includes("supplier")) {
      user.roles.push("supplier");
    }
    await user.save();

    const newSupplier = new SupplierModel({ userId, companyName, contact, region, phone: user.phone });
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

// Supprimer un Supplier
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await SupplierModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Supplier non trouvé" });
    }
    res.json({ message: "Supplier supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

export default router;