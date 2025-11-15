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
        };
      }

      if (email === adminEmail && password === adminPassword) {
        return {
          success: true,
          message: "Connexion réussie",
          error: null,
        };
      } else {
        return {
          success: false,
          message: null,
          error: "Email ou mot de passe incorrect",
        };
      }
    },
  },
};