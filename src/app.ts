import express, { Application } from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import fs from "fs";
import logger from "./utils/logger";
import { connectMongo } from "./data-source";
import { ApolloServer } from "apollo-server-express";
import { typeDefs, resolvers } from "./api/endpoints";
import exportExcelRouter from "./api/endpoints/candidature/exportExcel";
import smobilpayWebhookRouter from "./api/routes/smobilpayWebhook.routes";

async function startServer() {
  try {
    await connectMongo();
    logger.info("✅ Connecté à MongoDB");

    const app: Application = express();

    // --- CONFIGURATION DES DOSSIERS DE STOCKAGE ---
    const publicBase = path.join(process.cwd(), "public");
    const receiptsPath = path.join(publicBase, "receipts");
    const cvPath = path.join(publicBase, "uploads", "cv");

    [receiptsPath, cvPath].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`📁 Dossier créé ou vérifié : ${dir}`);
      }
    });

    // --- MIDDLEWARES ---
    app.use(express.json({ limit: "20mb" }));
    app.use(express.urlencoded({ limit: "20mb", extended: true }));

    // --- FICHIERS STATIQUES ---
    app.use("/receipts", express.static(receiptsPath));
    app.use("/uploads/cv", express.static(cvPath));

    // --- CORS ---
    app.use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://localhost:3001",
          "https://lapnomba.org",
          "https://admin.lapnomba.org",
          "https://admissions.lapnomba.org",
          "https://donate.lapnomba.org",
        ],
        credentials: true,
      })
    );

    // --- ROUTES API ---
    app.use("/api", exportExcelRouter);
    app.use("/api/smobilpay", smobilpayWebhookRouter);

    // --- APOLLO GRAPHQL ---
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      introspection: true,
    });

    await server.start();

    server.applyMiddleware({
      app: app as any,
      path: "/graphql",
      cors: false,
    });

    const port = Number(process.env.PORT) || 4000;
    const appBaseUrl =
      process.env.APP_BASE_URL ||
      `http://localhost:${port}`;

    app.listen(port, () => {
      logger.info(`🚀 Serveur actif sur le port ${port}`);
      logger.info(`📄 GraphQL : ${appBaseUrl}/graphql`);
      logger.info(`📂 CV locaux : ${appBaseUrl}/uploads/cv/`);
      logger.info(`💳 Smobilpay webhook : ${appBaseUrl}/api/smobilpay/webhook`);
      logger.info(`🔍 Smobilpay health : ${appBaseUrl}/api/smobilpay/health`);
    });
  } catch (err: any) {
    logger.error("❌ Erreur au démarrage du serveur :", err);
    process.exit(1);
  }
}

startServer();

export {};