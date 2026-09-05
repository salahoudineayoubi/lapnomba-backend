import jwt from "jsonwebtoken";
import { AuthenticationError } from "apollo-server-express";
import config from "../config";

/**
 * Auth partagé — admin uniquement.
 *
 * Un seul point de vérité pour signer/vérifier les tokens JWT admin,
 * réutilisé à la fois par :
 *  - le middleware Express `isAuth` (routes REST, ex: export Excel)
 *  - le context Apollo (resolvers GraphQL)
 *
 * Objectif : éviter de dupliquer la logique JWT à plusieurs endroits.
 */

export interface AdminTokenPayload {
  email: string;
  role: "admin";
}

const JWT_SECRET = process.env.JWT_SECRET || config.jwtSecret;
const ADMIN_TOKEN_EXPIRY = process.env.ADMIN_TOKEN_EXPIRY || "12h";

export const signAdminToken = (payload: AdminTokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ADMIN_TOKEN_EXPIRY } as jwt.SignOptions);
};

/**
 * Vérifie un token JWT admin. Retourne le payload décodé si valide,
 * `null` sinon (jamais de throw — laisse l'appelant décider de la réponse).
 */
export const verifyAdminToken = (token: string): AdminTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;

    if (!decoded || decoded.role !== "admin" || !decoded.email) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
};

/**
 * Extrait le token d'un header "Authorization: Bearer <token>".
 */
export const extractBearerToken = (authHeader?: string | null): string | null => {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) return null;

  return token;
};

/**
 * Résout l'admin authentifié à partir d'un header Authorization brut.
 * Utilisé pour construire le context Apollo et par le middleware Express.
 */
export const getAdminFromAuthHeader = (
  authHeader?: string | null
): AdminTokenPayload | null => {
  const token = extractBearerToken(authHeader);
  if (!token) return null;

  return verifyAdminToken(token);
};

/**
 * Context Apollo — attaché à chaque requête GraphQL (voir app.ts).
 */
export interface GraphQLContext {
  admin: AdminTokenPayload | null;
}

/**
 * Garde d'autorisation centralisée pour les resolvers "admin only".
 * Un seul point d'appel par resolver protégé, pas de logique dupliquée.
 * Lève une AuthenticationError (code GraphQL UNAUTHENTICATED) sinon.
 */
export const requireAdmin = (context: GraphQLContext | undefined): AdminTokenPayload => {
  if (!context?.admin) {
    throw new AuthenticationError("Authentification admin requise.");
  }

  return context.admin;
};
