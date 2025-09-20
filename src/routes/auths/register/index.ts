import { Router, Request, Response } from "express";
import { UserModel } from "../../../models/user";
import { CustomerModel } from "../../../models/customer";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
const router = Router();
router.post("/", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, address, password } = req.body;
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email déjà utilisé" });
    }
    const newUser = new UserModel({
      firstName,
      lastName,
      email,
      phone,
      address,
      password,
    });
    await newUser.save();

    // Par défaut, chaque nouvel utilisateur est un "Customer"
    const newCustomer = new CustomerModel({
      userId: newUser._id,
    });
    await newCustomer.save();

    // Générer un JWT avec RS256
    try {
      console.log("Lecture clé privée:", process.env.JWT_PRIVATE_KEY_PATH);
      const privateKey = fs.readFileSync(
        path.resolve(process.env.JWT_PRIVATE_KEY_PATH || "private.key"),
        "utf8"
      );
      console.log("Clé privée chargée");

      const token = jwt.sign(
        { userId: newUser._id, role: "customer" },
        privateKey,
        {
          algorithm: "RS256",
          expiresIn: "7d",
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE,
        }
      );
      res.status(201).json({
        message: "Compte créé avec succès",
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          email: newUser.email,
        },
        role: "customer",
        token,
      });
    } catch (jwtErr) {
      console.error("Erreur JWT:", jwtErr);
      return res.status(500).json({ message: "Erreur JWT", error: jwtErr });
    }
  } catch (err) {
    console.error("Erreur register:", err);
    res.status(500).json({ message: "Erreur serveur", error: err });
  }
});
export default router;