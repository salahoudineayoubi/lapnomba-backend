import { Router, Request, Response } from "express";
import { UserModel } from "../../../models/user";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(400).json({ message: "Utilisateur non trouvé" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect" });

    // ici tu peux générer un token JWT
    // et détecter les rôles (customer, seller, etc.)
    return res.json({ message: "Connexion réussie", user });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});

export default router;
