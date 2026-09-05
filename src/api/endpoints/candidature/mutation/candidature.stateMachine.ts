/**
 * State machine du statut de candidature.
 *
 * On conserve volontairement les valeurs françaises existantes
 * ("en attente" / "approuvée" / "refusée") pour rester compatible
 * avec les données déjà en base et le frontend actuel.
 *
 * Aucune procédure de réouverture n'existe pour le moment : une fois
 * "approuvée" ou "refusée", le statut est terminal.
 */
export type CandidatureStatut = "en attente" | "approuvée" | "refusée";

const ALLOWED_TRANSITIONS: Record<CandidatureStatut, CandidatureStatut[]> = {
  "en attente": ["approuvée", "refusée"],
  "approuvée": [],
  "refusée": [],
};

export const isTransitionAllowed = (
  from: CandidatureStatut,
  to: CandidatureStatut
): boolean => {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
};

/**
 * Message métier explicite pour une transition refusée, en fonction
 * du statut courant réel de la candidature. Utilisé pour donner à
 * l'admin une erreur claire plutôt qu'un échec silencieux/générique.
 */
export const explainTransitionRejection = (
  currentStatut: CandidatureStatut,
  targetStatut: "approuvée" | "refusée"
): string => {
  if (currentStatut === targetStatut) {
    return targetStatut === "approuvée"
      ? "La candidature a déjà été approuvée."
      : "La candidature a déjà été refusée.";
  }

  if (currentStatut === "approuvée" && targetStatut === "refusée") {
    return "Une candidature déjà approuvée ne peut pas être refusée sans procédure de réouverture.";
  }

  if (currentStatut === "refusée" && targetStatut === "approuvée") {
    return "Une candidature refusée ne peut pas être approuvée sans procédure de réouverture.";
  }

  return `Transition de statut invalide (${currentStatut} → ${targetStatut}).`;
};
