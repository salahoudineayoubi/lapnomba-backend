/**
 * Calcul d'âge et éligibilité au parcours gratuit de la Fondation.
 *
 * Règle métier unique : la date de naissance (`dateNaissance`) reste la
 * seule source de vérité. On ne stocke JAMAIS un âge calculé en base —
 * un candidat enregistré à 24 ans resterait sinon artificiellement à 24 ans
 * des années plus tard. L'âge est toujours recalculé à la volée.
 */

export const FREE_TRAINING_MAX_AGE = 25;

export class InvalidDateOfBirthError extends Error {}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REASONABLE_AGE_YEARS = 120;

/**
 * Parse une date de naissance au format ISO strict (AAAA-MM-JJ — celui
 * produit nativement par un <input type="date">). Rejette tout ce qui
 * n'est pas ce format exact, les dates calendaires impossibles (ex:
 * 2024-02-30), les dates futures, et les valeurs manifestement absurdes.
 *
 * Construction en UTC minuit : la date de naissance n'a pas d'heure/fuseau
 * propre, donc on fixe une référence unique pour que le calcul d'âge soit
 * déterministe quel que soit le fuseau du serveur qui l'exécute.
 */
export const parseDateOfBirth = (raw: unknown): Date => {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new InvalidDateOfBirthError("La date de naissance est requise.");
  }

  const trimmed = raw.trim();

  if (!ISO_DATE_REGEX.test(trimmed)) {
    throw new InvalidDateOfBirthError(
      "Date de naissance invalide (format attendu : AAAA-MM-JJ)."
    );
  }

  const [yearStr, monthStr, dayStr] = trimmed.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const date = new Date(Date.UTC(year, month - 1, day));

  // "Roundtrip" check : rejette les dates calendaires impossibles que
  // `Date` accepterait silencieusement en les décalant (ex: 30 février).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new InvalidDateOfBirthError("Date de naissance invalide.");
  }

  const now = new Date();

  if (date.getTime() > now.getTime()) {
    throw new InvalidDateOfBirthError("La date de naissance ne peut pas être dans le futur.");
  }

  if (year < now.getUTCFullYear() - MAX_REASONABLE_AGE_YEARS) {
    throw new InvalidDateOfBirthError("Date de naissance invalide.");
  }

  return date;
};

/**
 * Âge exact (en années révolues) à une date de référence donnée (par
 * défaut : maintenant). Compare mois ET jour — jamais un simple
 * `referenceYear - birthYear`, qui serait faux avant l'anniversaire.
 *
 * Déterministe et testable : passer `referenceDate` fige le "aujourd'hui"
 * dans les tests plutôt que de dépendre de l'horloge système.
 */
export const calculateAge = (dateOfBirth: Date, referenceDate: Date = new Date()): number => {
  let age = referenceDate.getUTCFullYear() - dateOfBirth.getUTCFullYear();

  const refMonth = referenceDate.getUTCMonth();
  const refDay = referenceDate.getUTCDate();
  const birthMonth = dateOfBirth.getUTCMonth();
  const birthDay = dateOfBirth.getUTCDate();

  const birthdayNotYetReachedThisYear =
    refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay);

  if (birthdayNotYetReachedThisYear) {
    age -= 1;
  }

  return age;
};

/**
 * Parse + calcule l'âge en un seul appel — le chemin utilisé par les
 * resolvers. Lève InvalidDateOfBirthError si la date brute est invalide.
 */
export const calculateAgeFromString = (
  raw: unknown,
  referenceDate: Date = new Date()
): number => {
  return calculateAge(parseDateOfBirth(raw), referenceDate);
};

export const isEligibleForFreeTraining = (age: number): boolean => age <= FREE_TRAINING_MAX_AGE;
