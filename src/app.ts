import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";
import logger from "./utils/logger";
import studentRoutes from "./routes/students";
import adminRoutes from "./routes/admin";
import joinTeamRequestRoutes from "./routes/joint_team_request";
import projectSummitRoutes from "./routes/projet_summit";
import newsletterSubscribeRoutes from "./routes/newsletter";
import donateurRoutes from "./routes/donateur";

async function startServer() {
  try {
    mongoose.set('strictQuery', true);

    if (!process.env.DB_URI) {
      throw new Error("DB_URI non défini dans .env");
    }
    await mongoose.connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as any);
    logger.info("✅ Connecté à MongoDB");

    const app = express();

    app.use(cors({
      origin: "http://localhost:3000", 
      credentials: true
    }));
    app.use(express.json());
    app.use("/api/students", studentRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/join-team-request", joinTeamRequestRoutes);
    app.use("/api/project-summit", projectSummitRoutes);
    app.use("/api/newsletter-subscribe", newsletterSubscribeRoutes);
    app.use("/api/donateurs", donateurRoutes);

    app.use("/api/join-team-request", (
      err: any,
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      if (err && err.code === 11000) {
        return res.status(409).json({
          error: "Vous avez déjà soumis une demande avec ces informations."
        });
      }
      next(err);
    });
    app.use("/api/newsletter-subscribe", (
      err: any,
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      if (err && err.code === 11000) {
        return res.status(409).json({ error: "Cet email est déjà inscrit à la newsletter." });
      }
      next(err);
    });
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      logger.info(`🚀 Serveur lancé sur le port ${port}`);
    });
  } catch (err: any) {
    logger.error("Erreur au démarrage du serveur :", err);
    process.exit(1);
  }
}
startServer();
export {};