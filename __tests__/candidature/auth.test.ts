import jwt from "jsonwebtoken";
import {
  signAdminToken,
  verifyAdminToken,
  extractBearerToken,
  getAdminFromAuthHeader,
  requireAdmin,
} from "../../src/utils/auth";

describe("utils/auth", () => {
  describe("signAdminToken / verifyAdminToken", () => {
    it("signe puis vérifie un token admin valide (aller-retour)", () => {
      const token = signAdminToken({ email: "admin@lapnomba.org", role: "admin" });
      const decoded = verifyAdminToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.email).toBe("admin@lapnomba.org");
      expect(decoded?.role).toBe("admin");
    });

    it("rejette un token invalide/malformé", () => {
      expect(verifyAdminToken("token.invalide.xyz")).toBeNull();
    });

    it("rejette un token signé avec une autre clé", () => {
      const foreignToken = jwt.sign({ email: "x@x.com", role: "admin" }, "une-autre-clé");
      expect(verifyAdminToken(foreignToken)).toBeNull();
    });

    it("rejette un token expiré", () => {
      const expired = jwt.sign(
        { email: "admin@lapnomba.org", role: "admin" },
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: -10 }
      );
      expect(verifyAdminToken(expired)).toBeNull();
    });
  });

  describe("extractBearerToken", () => {
    it("extrait le token d'un header Bearer valide", () => {
      expect(extractBearerToken("Bearer abc123")).toBe("abc123");
    });

    it("retourne null sans header", () => {
      expect(extractBearerToken(undefined)).toBeNull();
    });

    it("retourne null pour un schéma différent de Bearer", () => {
      expect(extractBearerToken("Basic abc123")).toBeNull();
    });
  });

  describe("getAdminFromAuthHeader", () => {
    it("résout l'admin depuis un header Authorization valide", () => {
      const token = signAdminToken({ email: "admin@lapnomba.org", role: "admin" });
      const admin = getAdminFromAuthHeader(`Bearer ${token}`);
      expect(admin?.email).toBe("admin@lapnomba.org");
    });

    it("retourne null sans header", () => {
      expect(getAdminFromAuthHeader(undefined)).toBeNull();
    });
  });

  describe("requireAdmin", () => {
    it("retourne l'admin si présent dans le context", () => {
      const admin = { email: "admin@lapnomba.org", role: "admin" as const };
      expect(requireAdmin({ admin })).toBe(admin);
    });

    it("lève une erreur d'authentification si le context n'a pas d'admin", () => {
      expect(() => requireAdmin({ admin: null })).toThrow();
    });

    it("lève une erreur d'authentification si le context est absent", () => {
      expect(() => requireAdmin(undefined)).toThrow();
    });
  });
});
