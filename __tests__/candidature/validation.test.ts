import {
  validateEmail,
  validatePhone,
  validateRequiredText,
  validateCandidatureInput,
  ValidationError,
} from "../../src/api/endpoints/candidature/mutation/candidature.validation";

describe("candidature.validation", () => {
  describe("validateEmail", () => {
    it("normalise l'email en lowercase et trim", () => {
      expect(validateEmail("  Test@Example.COM  ")).toBe("test@example.com");
    });

    it("rejette un email sans @", () => {
      expect(() => validateEmail("pas-un-email")).toThrow(ValidationError);
    });

    it("rejette un email vide", () => {
      expect(() => validateEmail("")).toThrow(ValidationError);
    });

    it("accepte un email valide simple", () => {
      expect(validateEmail("candidat@lapnomba.org")).toBe("candidat@lapnomba.org");
    });
  });

  describe("validatePhone", () => {
    it("accepte un numéro international avec indicatif", () => {
      expect(validatePhone("+237 672 01 89 99")).toBe("+237 672 01 89 99");
    });

    it("accepte un numéro local sans indicatif", () => {
      expect(validatePhone("672018999")).toBe("672018999");
    });

    it("rejette un numéro trop court", () => {
      expect(() => validatePhone("123")).toThrow(ValidationError);
    });

    it("rejette un numéro vide", () => {
      expect(() => validatePhone("")).toThrow(ValidationError);
    });
  });

  describe("validateRequiredText", () => {
    it("trim et accepte un texte valide", () => {
      expect(validateRequiredText("  Bonjour  ", "Champ")).toBe("Bonjour");
    });

    it("rejette un texte plus court que la longueur minimale", () => {
      expect(() => validateRequiredText("Hi", "Motivation", { min: 10 })).toThrow(ValidationError);
    });

    it("rejette un texte plus long que la longueur maximale", () => {
      expect(() => validateRequiredText("a".repeat(50), "Champ", { max: 10 })).toThrow(
        ValidationError
      );
    });
  });

  describe("validateCandidatureInput", () => {
    const validInput = {
      nomComplet: "Jean Dupont",
      dateNaissance: "1998-01-01",
      sexe: "M",
      adresse: "Rue 12",
      ville: "Douala",
      pays: "Cameroun",
      numeroWhatsapp: "+237672018999",
      email: "Jean.Dupont@Example.COM",
      choixFormation: "Développement web",
      pourquoiFormation: "Je veux apprendre à coder pour changer de carrière.",
    };

    it("accepte une candidature valide et normalise l'email", () => {
      const result = validateCandidatureInput(validInput);
      expect(result.email).toBe("jean.dupont@example.com");
      expect(result.nomComplet).toBe("Jean Dupont");
    });

    it("rejette une candidature avec un email invalide", () => {
      expect(() =>
        validateCandidatureInput({ ...validInput, email: "pas-un-email" })
      ).toThrow(ValidationError);
    });

    it("rejette une candidature avec un nom trop court", () => {
      expect(() => validateCandidatureInput({ ...validInput, nomComplet: "J" })).toThrow(
        ValidationError
      );
    });

    it("rejette une candidature avec une motivation trop courte", () => {
      expect(() =>
        validateCandidatureInput({ ...validInput, pourquoiFormation: "ok" })
      ).toThrow(ValidationError);
    });
  });
});
