import "dotenv/config";
import logger from "./utils/logger";
import { connectMongo } from "./data-source";
import { ApolloServer } from "apollo-server";
import { typeDefs, resolvers } from "./api/endpoints";

async function startServer() {
  try {
    await connectMongo();
    logger.info("Connecté à MongoDB");

    const server = new ApolloServer({
      typeDefs,
      resolvers,
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
    server.listen({ port }).then(({ url }) => {
      logger.info(`🚀 Serveur GraphQL lancé sur ${url}`);
    });
  } catch (err: any) {
    logger.error("❌ Erreur au démarrage du serveur :", err);
    process.exit(1);
  }
}
startServer();
export {};