import {
  isTransitionAllowed,
  explainTransitionRejection,
} from "../../src/api/endpoints/candidature/mutation/candidature.stateMachine";

describe("candidature.stateMachine", () => {
  describe("isTransitionAllowed", () => {
    it("autorise en attente -> approuvée", () => {
      expect(isTransitionAllowed("en attente", "approuvée")).toBe(true);
    });

    it("autorise en attente -> refusée", () => {
      expect(isTransitionAllowed("en attente", "refusée")).toBe(true);
    });

    it("interdit approuvée -> approuvée", () => {
      expect(isTransitionAllowed("approuvée", "approuvée")).toBe(false);
    });

    it("interdit refusée -> refusée", () => {
      expect(isTransitionAllowed("refusée", "refusée")).toBe(false);
    });

    it("interdit approuvée -> refusée", () => {
      expect(isTransitionAllowed("approuvée", "refusée")).toBe(false);
    });

    it("interdit refusée -> approuvée", () => {
      expect(isTransitionAllowed("refusée", "approuvée")).toBe(false);
    });
  });

  describe("explainTransitionRejection", () => {
    it("message clair pour une double approbation", () => {
      expect(explainTransitionRejection("approuvée", "approuvée")).toBe(
        "La candidature a déjà été approuvée."
      );
    });

    it("message clair pour un double refus", () => {
      expect(explainTransitionRejection("refusée", "refusée")).toBe(
        "La candidature a déjà été refusée."
      );
    });

    it("message clair pour refuser une candidature déjà approuvée", () => {
      expect(explainTransitionRejection("approuvée", "refusée")).toBe(
        "Une candidature déjà approuvée ne peut pas être refusée sans procédure de réouverture."
      );
    });

    it("message clair pour approuver une candidature refusée", () => {
      expect(explainTransitionRejection("refusée", "approuvée")).toBe(
        "Une candidature refusée ne peut pas être approuvée sans procédure de réouverture."
      );
    });
  });
});
