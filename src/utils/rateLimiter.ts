/**
 * Rate limiting en mémoire — volontairement simple (pas de Redis, pas de
 * nouvelle dépendance d'infrastructure) pour un déploiement mono-instance.
 * Protège les mutations publiques sensibles (ex: createCandidature) contre
 * la soumission automatisée en masse, sans bloquer un candidat normal qui
 * soumet une seule fois.
 */

export class RateLimitExceededError extends Error {}

const buckets = new Map<string, number[]>();

// Purge périodique pour ne pas laisser grossir la Map indéfiniment.
const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of buckets) {
    const kept = timestamps.filter((t) => now - t < 60 * 60 * 1000);
    if (kept.length === 0) buckets.delete(key);
    else buckets.set(key, kept);
  }
}, PRUNE_INTERVAL_MS).unref();

/**
 * Fenêtre glissante simple : lève RateLimitExceededError si `key` a déjà
 * atteint `maxRequests` occurrences dans les `windowMs` dernières ms.
 * Sinon, enregistre la tentative courante et retourne normalement.
 */
export const checkRateLimit = (
  key: string,
  { maxRequests, windowMs }: { maxRequests: number; windowMs: number }
): void => {
  const now = Date.now();
  const timestamps = (buckets.get(key) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    throw new RateLimitExceededError(
      "Trop de tentatives. Veuillez réessayer dans quelques minutes."
    );
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
};
