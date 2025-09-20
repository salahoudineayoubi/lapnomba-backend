import { Router, Request, Response } from "express";
import { ForwarderModel } from "../../../models/forwarder";
import { UserModel } from "../../../models/user";
import otpRouter from "./otp/ssl_wireless ";
const router = Router();
router.use("/otp", otpRouter);
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, companyName, city, address, postalCode, phone, activitiesDocument, taxDocument } = req.body;
    if (!phone || phone.countryCode !== "tr") {
      return res.status(400).json({ message: "Un numéro turc est obligatoire pour devenir forwarder." });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    user.phone = phone;
    if (!user.roles.includes("forwarder")) {
      user.roles.push("forwarder");
    }
    await user.save();

    const newForwarder = new ForwarderModel({
      userId,
      companyName,
      city,
      address,
      postalCode,
      phone: user.phone,
      activitiesDocument,
      taxDocument,
      status: "pending"
    });
    await newForwarder.save();

    res.status(201).json({ message: "Forwarder créé avec succès", forwarder: newForwarder });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

// Vérifier un Forwarder (admin)
router.patch("/:id/verify", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const forwarder = await ForwarderModel.findById(id);
    if (!forwarder) {
      return res.status(404).json({ message: "Forwarder non trouvé" });
    }
    forwarder.status = "verified";
    await forwarder.save();
    res.json({ message: "Forwarder vérifié avec succès", forwarder });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});


router.get("/", async (_req: Request, res: Response) => {
  try {
    const forwarders = await ForwarderModel.find().populate("userId");
    res.json(forwarders);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await ForwarderModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Forwarder non trouvé" });
    }
    res.json({ message: "Forwarder supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

export default router;