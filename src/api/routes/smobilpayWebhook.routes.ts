import { Router } from "express";
import { handleSmobilpayWebhook } from "../../services/smobilpay/smobilpay.webhook.service";
import { confirmDonationPayment } from "../endpoints/donateur/endpoints/financia/completion";
import { checkRateLimit, RateLimitExceededError } from "../../utils/rateLimiter";
import logger from "../../utils/logger";

const router = Router();

// Chaque appel déclenche une requête vers Smobilpay : on limite par IP.
const WEBHOOK_RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };
const VERIFY_RATE_LIMIT = { maxRequests: 20, windowMs: 15 * 60 * 1000 };

/**
 * GET /api/smobilpay/health
 */
router.get("/health", (_req, res) => {
  return res.status(200).json({ ok: true, service: "smobilpay-webhook" });
});

/**
 * POST /api/smobilpay/webhook
 * Le statut réel est toujours relu chez Smobilpay (voir le service).
 * La réponse ne renvoie aucune donnée interne.
 */
router.post("/webhook", async (req, res) => {
  try {
    checkRateLimit(`smobilpay-webhook:${req.ip}`, WEBHOOK_RATE_LIMIT);
    const result = await handleSmobilpayWebhook(req.body);
    return res.status(200).json({ ok: true, matched: result.matched });
  } catch (error: any) {
    if (error instanceof RateLimitExceededError) {
      return res.status(429).json({ ok: false });
    }
    logger.error("❌ Erreur traitement webhook Smobilpay", { message: error?.message });
    return res.status(500).json({ ok: false });
  }
});

/**
 * POST /api/smobilpay/verify/:donationId
 * Revérifie un don auprès de Smobilpay. Ne renvoie que le statut
 * (aucune donnée personnelle du donateur).
 */
router.post("/verify/:donationId", async (req, res) => {
  try {
    checkRateLimit(`smobilpay-verify:${req.ip}`, VERIFY_RATE_LIMIT);
    const donation = await confirmDonationPayment(req.params.donationId);
    return res.status(200).json({ ok: true, status: donation.status });
  } catch (error: any) {
    if (error instanceof RateLimitExceededError) {
      return res.status(429).json({ ok: false });
    }
    logger.error("❌ Erreur vérification paiement Smobilpay", { message: error?.message });
    return res.status(500).json({ ok: false, message: "Vérification impossible." });
  }
});

export default router;
