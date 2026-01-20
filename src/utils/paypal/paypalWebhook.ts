import { Router } from "express";
import { DonationModel } from "../../models/donor";
import { CrowdfundingCampaignModel } from "../../models/crowdfunding_campaign";
import { paypalVerifyWebhookSignature } from "../../utils/paypal";

export const paypalWebhookRouter = Router();

// IMPORTANT: PayPal envoie du JSON.
// Assure-toi d'utiliser express.json() avant cette route.
paypalWebhookRouter.post("/paypal/webhook", async (req, res) => {
  try {
    const transmissionId = req.header("paypal-transmission-id") || "";
    const transmissionTime = req.header("paypal-transmission-time") || "";
    const certUrl = req.header("paypal-cert-url") || "";
    const authAlgo = req.header("paypal-auth-algo") || "";
    const transmissionSig = req.header("paypal-transmission-sig") || "";

    const event = req.body;

    const ok = await paypalVerifyWebhookSignature({
      transmissionId,
      transmissionTime,
      certUrl,
      authAlgo,
      transmissionSig,
      webhookEvent: event,
    });

    if (!ok) return res.status(400).json({ ok: false, message: "Invalid webhook signature" });

    const eventType = event?.event_type as string | undefined;

    // On gère les plus utiles
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = event?.resource?.supplementary_data?.related_ids?.order_id;
      const captureId = event?.resource?.id;

      if (orderId) {
        const donation = await DonationModel.findOne({ provider: "PAYPAL", providerOrderId: orderId });

        if (donation) {
          donation.providerCaptureId = captureId;
          donation.status = "COMPLETED";
          await donation.save();

          // crowdfunding stats
          if (donation.campaignId) {
            await CrowdfundingCampaignModel.updateOne(
              { _id: donation.campaignId },
              { $inc: { totalRaised: donation.amount, donorsCount: 1 } }
            );
          }
        }
      }
    }

    if (eventType === "PAYMENT.CAPTURE.DENIED" || eventType === "PAYMENT.CAPTURE.REFUNDED") {
      const orderId = event?.resource?.supplementary_data?.related_ids?.order_id;
      if (orderId) {
        const donation = await DonationModel.findOne({ provider: "PAYPAL", providerOrderId: orderId });
        if (donation) {
          donation.status = eventType === "PAYMENT.CAPTURE.REFUNDED" ? "REFUNDED" : "FAILED";
          await donation.save();
        }
      }
    }

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || "Webhook error" });
  }
});
