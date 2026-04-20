import { Router } from "express";
import {
  handleSmobilpayWebhook,
  verifyDonationPaymentById,
} from "../../services/smobilpay/smobilpay.webhook.service";

const router = Router();

/**
 * Test rapide
 * GET /api/smobilpay/health
 */
router.get("/health", async (_req, res) => {
  return res.status(200).json({
    ok: true,
    service: "smobilpay-webhook",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Webhook principal
 * POST /api/smobilpay/webhook
 */
router.post("/webhook", async (req, res) => {
  try {
    const result = await handleSmobilpayWebhook(req.body);

    return res.status(200).json({
      ok: true,
      message: "Webhook traité avec succès.",
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: error?.message || "Erreur lors du traitement du webhook Smobilpay.",
    });
  }
});

/**
 * Vérification manuelle d'un paiement depuis un donationId
 * POST /api/smobilpay/verify/:donationId
 */
router.post("/verify/:donationId", async (req, res) => {
  try {
    const { donationId } = req.params;

    const donation = await verifyDonationPaymentById(donationId);

    return res.status(200).json({
      ok: true,
      message: "Vérification effectuée avec succès.",
      donation,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: error?.message || "Erreur lors de la vérification du paiement.",
    });
  }
});

export default router;