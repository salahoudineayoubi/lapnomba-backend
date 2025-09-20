import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

// Stockage temporaire des OTP (à remplacer par Redis ou DB en production)
const otpStore: Record<string, string> = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Envoi OTP
router.post("/send-otp", async (req: Request, res: Response) => {
  const { phone } = req.body; // phone = "+90xxxxxxxxxx"
  const otp = generateOTP();

  const params = new URLSearchParams({
    user: process.env.SSL_SMS_USER!,
    pass: process.env.SSL_SMS_PASSWORD!,
    sid: process.env.SSL_SMS_SID!,
    sms: `Votre code OTP est: ${otp}`,
    msisdn: phone.replace("+", ""),
  });

  try {
    console.log("Envoi OTP à :", phone, "Code :", otp);
    const response = await axios.post(process.env.SSL_SMS_URL!, params);
    console.log("Réponse SSL Wireless :", response.data);
    otpStore[phone] = otp; // Stocke l'OTP temporairement
    res.json({ success: true, message: "OTP envoyé" });
  } catch (err) {
    console.error("Erreur SSL Wireless :", err);
    res.status(500).json({ success: false, message: "Erreur envoi OTP", error: err });
  }
});

// Vérification OTP
router.post("/verify-otp", async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  if (otpStore[phone] && otpStore[phone] === otp) {
    delete otpStore[phone]; // Supprime l'OTP après vérification
    res.json({ success: true, message: "OTP validé" });
  } else {
    res.status(400).json({ success: false, message: "OTP incorrect" });
  }
});

export default router;