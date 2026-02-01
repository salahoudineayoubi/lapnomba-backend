import express, { Application, Router } from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import fs from "fs"; 
import logger from "./utils/logger";
import { connectMongo } from "./data-source";
import { ApolloServer } from "apollo-server-express";
import { typeDefs, resolvers } from "./api/endpoints";
import exportExcelRouter from "./api/endpoints/candidature/exportExcel";

// Importations PayPal & Reçus
import { DonationModel } from "./models/donor";
import { CrowdfundingCampaignModel } from "./models/crowdfunding_campaign";
import { paypalVerifyWebhookSignature } from "./utils/paypal";
import { generateAndSendReceipt } from "./utils/receipt";

export const paypalWebhookRouter = Router();

// --- ROUTE WEBHOOK PAYPAL ---
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

    if (!ok) {
      logger.warn("⚠️ Signature Webhook PayPal invalide");
      return res.status(400).json({ ok: false, message: "Invalid webhook signature" });
    }

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

          if (donation.campaignId) {
            await CrowdfundingCampaignModel.updateOne(
              { _id: donation.campaignId },
              { $inc: { totalRaised: donation.amount, donorsCount: 1 } }
            );
          }

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
    logger.error("🔥 Erreur Webhook PayPal:", e.message);
    return res.status(500).json({ ok: false, message: e?.message || "Webhook error" });
  }
});

// --- DÉMARRAGE DU SERVEUR ---
async function startServer() {
  try {
    await connectMongo();
    logger.info("✅ Connecté à MongoDB");

    const app: Application = express();

    // --- CONFIGURATION DES DOSSIERS DE STOCKAGE ---
    // Sur Railway, on s'assure que les dossiers existent dans le répertoire de travail
    const publicBase = path.join(process.cwd(), "public");
    const receiptsPath = path.join(publicBase, "receipts");
    const cvPath = path.join(publicBase, "uploads", "cv");
    
    // Création récursive des dossiers s'ils manquent (Crucial pour Railway)
    [receiptsPath, cvPath].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            logger.info(`📁 Dossier créé ou vérifié : ${dir}`);
        }
    });

    // Middlewares
    // On garde 20mb pour être tranquille avec les CV et les exports Excel
    app.use(express.json({ limit: "20mb" })); 
    app.use(express.urlencoded({ limit: "20mb", extended: true }));

    // --- SERVICE DES FICHIERS STATIQUES ---
    // Ces routes permettent au frontend d'accéder aux fichiers via l'URL Railway
    app.use("/receipts", express.static(receiptsPath));
    app.use("/uploads/cv", express.static(cvPath));

    // Sécurité CORS : Ajoute tes domaines frontend ici
    app.use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://localhost:3001",
          "https://lapnomba.org",
          "https://admin.lapnomba.org",
          "https://admissions.lapnomba.org",
          "https://donate.lapnomba.org"
        ],
        credentials: true,
      })
    );

    // Routes API Standard
    app.use("/api", exportExcelRouter);
    app.use("/api", paypalWebhookRouter);

    // Serveur Apollo
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      introspection: true, // Recommandé pour tester avec l'URL Railway /graphql
    });
    
    await server.start();
    server.applyMiddleware({
      app: app as any,
      path: "/graphql",
      cors: false, 
    });

    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      logger.info(`🚀 Serveur actif sur le port ${port}`);
      logger.info(`📄 GraphQL : https://lapnomba-backend-production-c06d.up.railway.app/graphql`);
      logger.info(`📂 CV locaux : https://lapnomba-backend-production-c06d.up.railway.app/uploads/cv/`);
    });

  } catch (err: any) {
    logger.error("❌ Erreur au démarrage du serveur :", err);
    process.exit(1);
  }
}

startServer();
export {};