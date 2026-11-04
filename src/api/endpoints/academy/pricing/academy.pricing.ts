/**
 * Calcul serveur-autoritaire du tarif Academy.
 *
 * Extrait de `resolver/application/index.ts` (comportement inchangé) pour
 * être réutilisable et testable isolément, et pour documenter clairement
 * une règle de sécurité : le prix affiché/payé ne doit JAMAIS provenir
 * d'un champ envoyé par le client (voir Phase 3 — "Payment Security").
 */

export type AcademyTrainingMode = "online" | "hybrid" | "onsite" | "custom";

// Mêmes valeurs de repli qu'avant Phase 3 (comportement préservé) — utilisées
// uniquement si le programme référencé n'a pas de prix pour le mode demandé.
const FALLBACK_ONLINE_PRICE = 500000;
const FALLBACK_HYBRID_PRICE = 800000;

export const getAmountByMode = (program: any, mode: string): number => {
  if (!program) return 0;

  if (mode === "online") return program.onlinePrice || FALLBACK_ONLINE_PRICE;
  if (mode === "hybrid") return program.hybridPrice || FALLBACK_HYBRID_PRICE;
  if (mode === "onsite") {
    return program.onsitePrice || program.hybridPrice || FALLBACK_HYBRID_PRICE;
  }

  // "custom" (sur devis) : pas de montant automatique, un devis manuel
  // (quoteUrl / expectedAmount ajusté par un admin) est requis.
  return 0;
};

/**
 * Détermine si une candidature nécessite un devis manuel, indépendamment de
 * ce que le client a pu envoyer (le client ne doit jamais pouvoir désactiver
 * une exigence de devis en mentant sur ce champ).
 */
export const computeRequiresQuote = (
  applicantType: string,
  trainingMode: string,
  program: any
): boolean => {
  const isOrganization = applicantType === "entreprise" || applicantType === "ong";
  const isCustom = trainingMode === "custom";
  return isOrganization || isCustom || !program;
};

/**
 * Calcule le montant attendu et la mensualité pour une candidature, à partir
 * UNIQUEMENT du programme (source de vérité serveur) et du mode de
 * formation. Les valeurs équivalentes envoyées par le client sont ignorées.
 */
export const computeAcademyPricing = (program: any, trainingMode: string) => {
  return {
    expectedAmount: getAmountByMode(program, trainingMode),
    monthlyPrice: program?.monthlyPrice ?? 30000,
    currency: program?.currency || "XAF",
  };
};
