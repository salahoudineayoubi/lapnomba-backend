/**
 * Validation serveur — candidature apprenant.
 *
 * Volontairement simple (regex + longueurs raisonnables), sans librairie
 * externe, pour rester cohérent avec le reste du projet. Ne rejette pas
 * les numéros internationaux légitimes.
 */

export class ValidationError extends Error {}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Accepte les formats internationaux courants : +237 672 01 89 99, 00237672018999,
// 672018999, avec espaces/points/tirets/parenthèses. 7 à 20 chiffres significatifs.
const PHONE_REGEX = /^\+?[0-9][0-9\s().-]{5,19}$/;

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const validateEmail = (email: string): string => {
  const normalized = normalizeEmail(email || "");

  if (!normalized || !EMAIL_REGEX.test(normalized)) {
    throw new ValidationError("Adresse email invalide.");
  }

  return normalized;
};

export const validatePhone = (phone: string, fieldLabel = "Numéro WhatsApp"): string => {
  const trimmed = (phone || "").trim();

  if (!trimmed || !PHONE_REGEX.test(trimmed)) {
    throw new ValidationError(`${fieldLabel} invalide.`);
  }

  return trimmed;
};

export const validateRequiredText = (
  value: string,
  fieldLabel: string,
  { min = 1, max = 500 }: { min?: number; max?: number } = {}
): string => {
  const trimmed = (value || "").trim();

  if (trimmed.length < min) {
    throw new ValidationError(
      min <= 1
        ? `${fieldLabel} est requis.`
        : `${fieldLabel} doit contenir au moins ${min} caractères.`
    );
  }

  if (trimmed.length > max) {
    throw new ValidationError(`${fieldLabel} ne doit pas dépasser ${max} caractères.`);
  }

  return trimmed;
};

export const trimOptional = (value?: string | null): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

/**
 * Valide et normalise l'ensemble des champs d'une candidature entrante.
 * Retourne un objet prêt à être fusionné dans le document Mongoose.
 * Lève une ValidationError avec un message clair au premier champ invalide.
 */
export const validateCandidatureInput = (input: any) => {
  const nomComplet = validateRequiredText(input.nomComplet, "Le nom complet", { min: 2, max: 150 });
  const email = validateEmail(input.email);
  const numeroWhatsapp = validatePhone(input.numeroWhatsapp, "Le numéro WhatsApp");
  const adresse = validateRequiredText(input.adresse, "L'adresse", { min: 2, max: 300 });
  const ville = validateRequiredText(input.ville, "La ville", { min: 2, max: 150 });
  const pays = validateRequiredText(input.pays, "Le pays", { min: 2, max: 150 });
  const dateNaissance = validateRequiredText(input.dateNaissance, "La date de naissance", { min: 1, max: 40 });
  const sexe = validateRequiredText(input.sexe, "Le sexe", { min: 1, max: 30 });
  const choixFormation = validateRequiredText(input.choixFormation, "Le choix de formation", { min: 1, max: 200 });
  const pourquoiFormation = validateRequiredText(
    input.pourquoiFormation,
    "La motivation",
    { min: 10, max: 3000 }
  );

  return {
    ...input,
    nomComplet,
    email,
    numeroWhatsapp,
    adresse,
    ville,
    pays,
    dateNaissance,
    sexe,
    choixFormation,
    pourquoiFormation,
  };
};
