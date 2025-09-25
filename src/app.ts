import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import "dotenv/config";
import logger from "./utils/logger";
import { AppDataSource } from "./data-source";
import studentRoutes from "./routes/students";
import adminRoutes from "./routes/admin";
import joinTeamRequestRoutes from "./routes/joint_team_request";
import projectSummitRoutes from "./routes/projet_summit";
import newsletterSubscribeRoutes from "./routes/newsletter";
import donateurRoutes from "./routes/donateur";
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
    app.use("/api/students", studentRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/join-team-request", joinTeamRequestRoutes);
    app.use("/api/project-summit", projectSummitRoutes);
    app.use("/api/newsletter-subscribe", newsletterSubscribeRoutes);
    app.use("/api/donateurs", donateurRoutes);

    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err && err.code === "ER_DUP_ENTRY") {
        if (req.path.startsWith("/api/join-team-request")) {
          return res.status(409).json({
            error: "Vous avez déjà soumis une demande avec ces informations."
          });
        }
        if (req.path.startsWith("/api/newsletter-subscribe")) {
          return res.status(409).json({ error: "Cet email est déjà inscrit à la newsletter." });
        }
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