import { signAdminToken } from "../../../utils/auth";

export const adminResolvers = {
  Mutation: {
    adminLogin: async (
      _: any,
      { email, password }: { email: string; password: string }
    ) => {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!email || !password) {
        return {
          success: false,
          message: null,
          error: "Email et mot de passe requis",
          token: null,
        };
      }

      if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
        const token = signAdminToken({ email, role: "admin" });

        return {
          success: true,
          message: "Connexion réussie",
          error: null,
          token,
        };
      } else {
        return {
          success: false,
          message: null,
          error: "Email ou mot de passe incorrect",
          token: null,
        };
      }
    },
  },
};