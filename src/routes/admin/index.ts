import express from "express";

const router = express.Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (email === adminEmail && password === adminPassword) {
    return res.status(200).json({ message: "Connexion réussie" });
  } else {
    return res.status(401).json({ error: "Email ou mot de passe incorrect" });
  }
});

export default router;
