import express, { Application } from "express";
import cors from "cors";
import "dotenv/config";
import logger from "./utils/logger";
import { connectMongo } from "./data-source";
import { ApolloServer } from "apollo-server-express";
import { typeDefs, resolvers } from "./api/endpoints";

async function startServer() {
  try {
    await connectMongo();
    logger.info("✅ Connecté à MongoDB");
    const app: Application = express();
    app.use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://localhost:3001",
          "https://lapnomba.org",
          "https://admin.lapnomba.org",
        ],
        credentials: true,
      })
    );

    app.use(express.json());

    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });
    await server.start();
    server.applyMiddleware({ app: app as any, path: "/graphql" });
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