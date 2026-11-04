/**
 * Validation serveur — candidature Academy (payante).
 *
 * Même approche que `candidature/mutation/candidature.validation.ts`
 * (regex + longueurs raisonnables, pas de librairie externe). Couvre à la
 * fois la validation de forme (champs requis, formats) et le nettoyage des
 * champs "métier" sensibles au tarif (voir `academy.pricing.ts`) qui ne
 * doivent jamais être acceptés tels quels depuis le client.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9][0-9\s().-]{5,19}$/;

export class ValidationError extends Error {}

const APPLICANT_TYPES = ["professionnel", "entreprise", "ong", "diaspora"];
const TRAINING_MODES = ["online", "hybrid", "onsite", "custom"];

export const normalizeEmail = (email: string): string => (email || "").trim().toLowerCase();

const validateEmail = (email: string): string => {
  const normalized = normalizeEmail(email);
  if (!normalized || !EMAIL_REGEX.test(normalized)) {
    throw new ValidationError("Adresse email invalide.");
  }
  return normalized;
};

const validatePhone = (phone: string, label: string): string => {
  const trimmed = (phone || "").trim();
  if (!trimmed || !PHONE_REGEX.test(trimmed)) {
    throw new ValidationError(`${label} invalide.`);
  }
  return trimmed;
};

const validateRequiredText = (
  value: string,
  label: string,
  { min = 1, max = 500 }: { min?: number; max?: number } = {}
): string => {
  const trimmed = (value || "").trim();
  if (trimmed.length < min) {
    throw new ValidationError(
      min <= 1 ? `${label} est requis.` : `${label} doit contenir au moins ${min} caractères.`
    );
  }
  if (trimmed.length > max) {
    throw new ValidationError(`${label} ne doit pas dépasser ${max} caractères.`);
  }
  return trimmed;
};

const trimOptional = (value?: string | null, max = 500): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim().slice(0, max);
  return trimmed.length ? trimmed : undefined;
};

/**
 * Valide les champs de forme d'une candidature Academy. Ne touche PAS aux
 * champs tarifaires (expectedAmount, monthlyPrice, currency, requiresQuote)
 * — ceux-ci sont volontairement recalculés côté serveur ailleurs
 * (voir `academy.pricing.ts`), jamais repris depuis l'input client.
 */
export const validateAcademyApplicationInput = (input: any) => {
  const applicantType = (input.applicantType || "").trim();
  if (!APPLICANT_TYPES.includes(applicantType)) {
    throw new ValidationError("Type de candidat invalide.");
  }

  const trainingMode = (input.trainingMode || "").trim();
  if (!TRAINING_MODES.includes(trainingMode)) {
    throw new ValidationError("Mode de formation invalide.");
  }

  const fullName = validateRequiredText(input.fullName, "Le nom complet", { min: 2, max: 150 });
  const email = validateEmail(input.email);
  const phone = validatePhone(input.phone, "Le numéro de téléphone");
  const country = validateRequiredText(input.country, "Le pays", { min: 2, max: 150 });
  const selectedTrack = validateRequiredText(input.selectedTrack, "La formation choisie", { min: 1, max: 200 });
  const learningGoal = validateRequiredText(input.learningGoal, "L'objectif d'apprentissage", { min: 5, max: 3000 });

  const numberOfParticipants = Math.min(
    Math.max(Number.isFinite(Number(input.numberOfParticipants)) ? Number(input.numberOfParticipants) : 1, 1),
    500
  );

  return {
    applicantType,
    trainingMode,
    fullName,
    email,
    phone,
    whatsapp: trimOptional(input.whatsapp, 30),
    country,
    city: trimOptional(input.city, 150),
    organizationName: trimOptional(input.organizationName, 200),
    organizationType: trimOptional(input.organizationType, 100),
    position: trimOptional(input.position, 150),
    website: trimOptional(input.website, 300),
    programId: input.programId || undefined,
    selectedTrack,
    numberOfParticipants,
    preferredStartDate: trimOptional(input.preferredStartDate, 30),
    learningGoal,
    currentLevel: trimOptional(input.currentLevel, 100),
    estimatedBudget: trimOptional(input.estimatedBudget, 200),
    understandsImpactModel: input.understandsImpactModel ?? true,
  };
};
