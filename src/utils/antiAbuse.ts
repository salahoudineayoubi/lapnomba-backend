/**
 * Protections anti-abus des formulaires publics : captcha Cloudflare Turnstile,
 * adresses e-mail jetables, normalisation de noms.
 */
import axios from "axios";
import logger from "./logger";

let warnedNoTurnstile = false;

/**
 * Vérifie un jeton Cloudflare Turnstile. Sans TURNSTILE_SECRET_KEY configurée,
 * la vérification est désactivée (journalisé une fois) pour ne pas bloquer
 * un environnement de développement.
 */
export const verifyTurnstile = async (token: string | undefined | null, ip?: string): Promise<boolean> => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (!warnedNoTurnstile) {
      logger.warn("TURNSTILE_SECRET_KEY absente : vérification anti-robot désactivée.");
      warnedNoTurnstile = true;
    }
    return true;
  }
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) });
    const { data } = await axios.post<{ success?: boolean }>("https://challenges.cloudflare.com/turnstile/v0/siteverify", body, {
      timeout: 8000,
    });
    return Boolean(data?.success);
  } catch (err) {
    logger.error("Échec de la vérification Turnstile", { error: err instanceof Error ? err.message : err });
    return false;
  }
};

// Domaines d'e-mails jetables les plus courants (liste volontairement courte et stable).
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "yopmail.com", "yopmail.fr", "yopmail.net", "10minutemail.com", "10minutemail.net",
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "sharklasers.com", "grr.la",
  "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmail.net", "tempmailo.com", "tempail.com",
  "trashmail.com", "trashmail.de", "getnada.com", "nada.email", "dispostable.com", "maildrop.cc",
  "fakeinbox.com", "throwawaymail.com", "mohmal.com", "emailondeck.com", "mintemail.com",
  "mailnesia.com", "burnermail.io", "moakt.com", "tmail.ws", "spamgourmet.com", "mailcatch.com",
  "33mail.com", "inboxkitten.com", "emailfake.com", "crazymailing.com", "minuteinbox.com",
  "luxusmail.org", "tempinbox.com", "discard.email", "mail.tm", "cock.li", "byom.de",
]);

export const isDisposableEmail = (email: string): boolean => {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return !!domain && DISPOSABLE_DOMAINS.has(domain);
};

/** « Ndjock Éloïse  » → « ndjock eloise » (comparaison de noms tolérante). */
export const normalizeName = (value: string): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
