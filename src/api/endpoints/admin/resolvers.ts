import crypto from "crypto";
import { signAdminToken, GraphQLContext } from "../../../utils/auth";
import { checkRateLimit, RateLimitExceededError } from "../../../utils/rateLimiter";

// 5 tentatives par IP toutes les 15 minutes (anti force brute).
const ADMIN_LOGIN_RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 };

/** Comparaison en temps constant (évite de deviner le mot de passe par mesure du temps de réponse). */
const safeEqual = (a: string, b: string): boolean => {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

const failure = (error: string) => ({ success: false, message: null, error, token: null });

export const adminResolvers = {
  Mutation: {
    adminLogin: async (
      _: any,
      { email, password }: { email: string; password: string },
      context: GraphQLContext
    ) => {
      try {
        checkRateLimit(`admin-login:${context?.ip ?? "unknown"}`, ADMIN_LOGIN_RATE_LIMIT);
      } catch (err) {
        if (err instanceof RateLimitExceededError) return failure(err.message);
        throw err;
      }

      if (!email || !password) {
        return failure("Email et mot de passe requis");
      }

      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      const valid =
        !!adminEmail &&
        !!adminPassword &&
        safeEqual(email.trim().toLowerCase(), adminEmail.trim().toLowerCase()) &&
        safeEqual(password, adminPassword);

      if (!valid) {
        return failure("Email ou mot de passe incorrect");
      }

      return {
        success: true,
        message: "Connexion réussie",
        error: null,
        token: signAdminToken({ email: adminEmail!, role: "admin" }),
      };
    },
  },
};
