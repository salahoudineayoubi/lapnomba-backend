import express from "express";
import cors from "cors";
import "dotenv/config";
import logger from "./utils/logger";
import { AppDataSource } from "./data-source";
import { ApolloServer } from "apollo-server-express";
import { typeDefs, resolvers } from "./api/endpoints";

async function startServer() {
  try {
    await AppDataSource.initialize();
    logger.info("✅ Connecté à MySQL");
    const app = express();

    app.use(cors({
      origin: [
        "http://localhost:3000",
        "https://lapnomba.org",
        "https://admin.lapnomba.org",
        "https://lapnomba-backend-production.up.railway.app"
      ],
      credentials: true
    }));
    app.use(express.json());

    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });
    await server.start();
    server.applyMiddleware({ app, path: "/graphql" });

    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      logger.info(`🚀 Serveur GraphQL lancé sur le port ${port}`);
    });
  } catch (err: any) {
    logger.error("Erreur au démarrage du serveur :", err);
    process.exit(1);
  }
}
startServer();
export {};