import express, { Application } from "express";
import cors from "cors";
import "dotenv/config";
import logger from "./utils/logger";
import { connectMongo } from "./data-source";
import { ApolloServer } from "apollo-server-express";
import { typeDefs, resolvers } from "./api/endpoints";
import exportExcelRouter from "./api/endpoints/candidature/exportExcel"; // <-- Ajoute cette ligne

async function startServer() {
  try {
    await connectMongo();
    logger.info("Connecté à MongoDB");
    const app: Application = express();

    // Augmente la taille maximale du body pour supporter les fichiers en base64
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ limit: "10mb", extended: true }));

    app.use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://localhost:3001",
          "https://lapnomba.org",
          "https://admin.lapnomba.org",
          "https://admissions.lapnomba.org",
        ],
        credentials: true,
      })
    );

    app.use("/api", exportExcelRouter); // <-- Ajoute cette ligne pour la route Excel

    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });
    await server.start();
    server.applyMiddleware({
      app: app as any,
      path: "/graphql",
      cors: {
        origin: [
          "http://localhost:3000",
          "http://localhost:3001",
          "https://lapnomba.org",
          "https://admin.lapnomba.org",
          "https://admissions.lapnomba.org",
        ],
        credentials: true,
      },
    });

    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      logger.info(`🚀 Serveur GraphQL lancé sur le port ${port}`);
    });
  } catch (err: any) {
    logger.error("❌ Erreur au démarrage du serveur :", err);
    process.exit(1);
  }
}
startServer();
export {};