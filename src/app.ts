import express, { Application } from "express";
import cors from "cors";
import "dotenv/config";
import logger from "./utils/logger";
import { connectMongo } from "./data-source";
import { ApolloServer } from "apollo-server-express";
import { typeDefs, resolvers } from "./api/endpoints";
import exportExcelRouter from "./api/endpoints/candidature/exportExcel";

async function startServer() {
  try {
    await connectMongo();
    logger.info("Connecté à MongoDB");
    const app: Application = express();

    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map(origin => origin.trim())
      : [
          "http://localhost:3000",
          "http://localhost:3001",
          "https://lapnomba.org",
          "https://admin.lapnomba.org",
          "https://admissions.lapnomba.org",
        ];

    app.use(cors({
      origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    }));

    // Ajoute le header pour toutes les réponses
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Credentials", "true");
      next();
    });

    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ limit: "10mb", extended: true }));

    // Gère les requêtes OPTIONS globalement
    app.options("*", cors());

    app.use("/api", exportExcelRouter);

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
    });
  } catch (err: any) {
    logger.error("❌ Erreur au démarrage du serveur :", err);
    process.exit(1);
  }
}
startServer();
export {};