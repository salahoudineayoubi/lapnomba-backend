// Secret factice pour les tests (le serveur refuse de démarrer sans JWT_SECRET).
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-jest-only-0123456789";
