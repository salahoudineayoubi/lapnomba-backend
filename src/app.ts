import express, { Application, Router } from "express";
import cors from "cors";
import "dotenv/config";
import path from "path"; // Ajouté pour la gestion des chemins
import logger from "./utils/logger";
import { connectMongo } from "./data-source";
import { ApolloServer } from "apollo-server-express";
import { typeDefs, resolvers } from "./api/endpoints";
import exportExcelRouter from "./api/endpoints/candidature/exportExcel";

// Importations pour PayPal et Reçus
import { DonationModel } from "./models/donor";
import { CrowdfundingCampaignModel } from "./models/crowdfunding_campaign";
import { paypalVerifyWebhookSignature } from "./utils/paypal";
import { generateAndSendReceipt } from "./utils/receipt"; // Importation du service de reçu

export const paypalWebhookRouter = Router();

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

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = event?.resource?.supplementary_data?.related_ids?.order_id;
      const captureId = event?.resource?.id;

      if (orderId) {
        const donation = await DonationModel.findOne({ provider: "PAYPAL", providerOrderId: orderId });

        if (donation && donation.status !== "COMPLETED") {
          donation.providerCaptureId = captureId;
          donation.status = "COMPLETED";
          await donation.save();

          // Mise à jour des compteurs de campagne
          if (donation.campaignId) {
            await CrowdfundingCampaignModel.updateOne(
              { _id: donation.campaignId },
              { $inc: { totalRaised: donation.amount, donorsCount: 1 } }
            );
          }

          // ✅ ENVOI DU REÇU AUTOMATIQUE POUR PAYPAL
          generateAndSendReceipt(donation).catch(err => 
            logger.error("❌ Erreur envoi reçu PayPal:", err)
          );
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

async function startServer() {
  try {
    await connectMongo();
    logger.info("✅ Connecté à MongoDB");
    const app: Application = express();

    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ limit: "10mb", extended: true }));

    // ✅ CONFIGURATION DU DOSSIER STATIQUE POUR LES REÇUS
    // Cela permet d'accéder aux PDFs via https://api.lapnomba.org/receipts/RECU-XXXX.pdf
    const publicPath = path.join(__dirname, "../public/receipts");
    app.use("/receipts", express.static(publicPath));

    app.use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://localhost:3001",
          "https://lapnomba.org",
          "http://lapnomba.org",
          "https://admin.lapnomba.org",
          "http://admin.lapnomba.org",
          "https://admissions.lapnomba.org",
          "http://admissions.lapnomba.org",
          "https://donate.lapnomba.org"
        ],
        credentials: true,
      })
    );

    app.use("/api", exportExcelRouter);
    app.use("/api", paypalWebhookRouter);

    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });
    
    await server.start();
    server.applyMiddleware({
      app: app as any,
      path: "/graphql",
      cors: false,
    });

    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      logger.info(`🚀 Serveur GraphQL lancé sur le port ${port}`);
      logger.info(`📁 Reçus servis depuis : ${publicPath}`);
    });
  } catch (err: any) {
    logger.error("❌ Erreur au démarrage du serveur :", err);
    process.exit(1);
  }
}

startServer();
export {};