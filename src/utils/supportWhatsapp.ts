/**
 * Numéro WhatsApp support — normalisation, validation et formats dérivés.
 *
 * Format canonique stocké : uniquement des chiffres, indicatif pays compris,
 * sans "+" ni "00" (ex. "237657588317"), directement utilisable dans un lien
 * wa.me. L'affichage ("+237 657 588 317") et le lien sont toujours dérivés de
 * ce format, jamais saisis séparément.
 */

export const WHATSAPP_MIN_DIGITS = 8;
export const WHATSAPP_MAX_DIGITS = 15; // E.164

export class SupportWhatsappError extends Error {}

/**
 * Accepte "+237 657 588 317", "237-657-588-317", "00237657588317",
 * "(+237) 657.588.317"… Refuse tout autre caractère (lettres, etc.) et toute
 * longueur hors 8–15 chiffres. Retourne les chiffres seuls.
 */
export const normalizeSupportWhatsapp = (raw: unknown): string => {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) throw new SupportWhatsappError("Le numéro WhatsApp est requis.");
  if (!/^[+\d\s().\-]+$/.test(value)) {
    throw new SupportWhatsappError("Le numéro WhatsApp ne peut contenir que des chiffres, espaces, tirets, points, parenthèses et un « + » initial.");
  }
  if ((value.match(/\+/g) || []).length > 1 || (value.includes("+") && !/^\(?\+/.test(value))) {
    throw new SupportWhatsappError("Le « + » n'est autorisé qu'au début du numéro.");
  }
  let digits = value.replace(/\D/g, "");
  // Préfixe international "00" (ex. 00237…) équivalent au "+".
  if (!value.includes("+") && digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length < WHATSAPP_MIN_DIGITS || digits.length > WHATSAPP_MAX_DIGITS) {
    throw new SupportWhatsappError(
      `Le numéro WhatsApp doit compter entre ${WHATSAPP_MIN_DIGITS} et ${WHATSAPP_MAX_DIGITS} chiffres, indicatif pays compris (ex. +237 657 588 317).`
    );
  }
  if (digits.startsWith("0")) {
    throw new SupportWhatsappError("Indiquez le numéro au format international, indicatif pays compris (ex. +237 657 588 317).");
  }
  return digits;
};

/** Variante non bloquante : chiffres valides ou null. */
export const tryNormalizeSupportWhatsapp = (raw: unknown): string | null => {
  try {
    return normalizeSupportWhatsapp(raw);
  } catch {
    return null;
  }
};

/**
 * "237657588317" → "+237 657 588 317" : chiffres regroupés par 3 (format
 * Cameroun : 237 + 9 chiffres), dernier groupe éventuellement plus court.
 */
export const formatWhatsappDisplay = (digits: string): string => {
  const groups = digits.match(/.{1,3}/g) || [digits];
  return `+${groups.join(" ")}`;
};

export const buildWhatsappLink = (digits: string): string => `https://wa.me/${digits}`;
