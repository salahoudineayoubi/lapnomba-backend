import { Request, Response, NextFunction } from "express";
import { AdminTokenPayload, getAdminFromAuthHeader } from "../utils/auth";

export interface AuthenticatedRequest extends Request {
  admin?: AdminTokenPayload;
}

/**
 * Middleware Express — protège les routes REST admin (ex: export Excel).
 * Réutilise la même vérification JWT que le context GraphQL (voir utils/auth.ts)
 * pour ne pas dupliquer la logique d'authentification.
 */
export const isAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const admin = getAdminFromAuthHeader(req.headers["authorization"]);

  if (!admin) {
    return res.status(401).json({ message: "Accès non autorisé : token admin manquant ou invalide" });
  }

  req.admin = admin;
  next();
};
