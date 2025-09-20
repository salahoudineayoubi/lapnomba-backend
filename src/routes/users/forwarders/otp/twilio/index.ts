import { Router, Request, Response } from "express";
import twilio from "twilio";

const router = Router();
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Envoi OTP
router.post("/send-otp", async (req: Request, res: Response) => {
  const { phone } = req.body; // phone = "+90xxxxxxxxxx"
  try {
    await client.verify
      .services(process.env.TWILIO_VERIFY_SID!)
      .verifications.create({ to: phone, channel: "sms" });

    // Envoi WhatsApp (Twilio attend le format "whatsapp:+90xxxxxxxxxx")
    await client.verify
      .services(process.env.TWILIO_VERIFY_SID!)
      .verifications.create({ to: `whatsapp:${phone}`, channel: "whatsapp" });

    res.json({ success: true, message: "OTP envoyé par SMS et WhatsApp" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur envoi OTP", error: err });
  }
});

// Vérification OTP
router.post("/verify-otp", async (req: Request, res: Response) => {
  const { phone, code } = req.body;
  try {
    const verification_check = await client.verify
      .services(process.env.TWILIO_VERIFY_SID!)
      .verificationChecks.create({ to: phone, code });
    if (verification_check.status === "approved") {
      res.json({ success: true, message: "OTP validé" });
    } else {
      res.status(400).json({ success: false, message: "OTP incorrect" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur vérification OTP", error: err });
  }
});

export default router;