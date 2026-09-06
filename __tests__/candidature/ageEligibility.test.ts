import {
  parseDateOfBirth,
  calculateAge,
  calculateAgeFromString,
  isEligibleForFreeTraining,
  InvalidDateOfBirthError,
  FREE_TRAINING_MAX_AGE,
} from "../../src/utils/ageEligibility";

// Référence fixe pour des tests déterministes — jamais l'horloge système.
const REFERENCE_DATE = new Date(Date.UTC(2026, 8, 6)); // 6 septembre 2026

describe("ageEligibility.calculateAge (âge exact, pas année - année)", () => {
  it("24 ans -> éligible", () => {
    const dob = new Date(Date.UTC(2001, 8, 6)); // anniversaire aujourd'hui même
    expect(calculateAge(dob, REFERENCE_DATE)).toBe(25);
  });

  it("25 ans exactement (anniversaire le jour même) -> éligible", () => {
    const dob = new Date(Date.UTC(2001, 8, 6));
    const age = calculateAge(dob, REFERENCE_DATE);
    expect(age).toBe(25);
    expect(isEligibleForFreeTraining(age)).toBe(true);
  });

  it("26 ans -> non éligible", () => {
    const dob = new Date(Date.UTC(2000, 8, 6));
    const age = calculateAge(dob, REFERENCE_DATE);
    expect(age).toBe(26);
    expect(isEligibleForFreeTraining(age)).toBe(false);
  });

  it("anniversaire des 26 ans DEMAIN -> encore 25 ans aujourd'hui -> éligible", () => {
    const dob = new Date(Date.UTC(2000, 8, 7)); // 7 septembre 2000
    const age = calculateAge(dob, REFERENCE_DATE); // référence = 6 septembre 2026
    expect(age).toBe(25);
    expect(isEligibleForFreeTraining(age)).toBe(true);
  });

  it("anniversaire des 26 ans AUJOURD'HUI -> déjà 26 ans -> non éligible", () => {
    const dob = new Date(Date.UTC(2000, 8, 6)); // 6 septembre 2000
    const age = calculateAge(dob, REFERENCE_DATE);
    expect(age).toBe(26);
    expect(isEligibleForFreeTraining(age)).toBe(false);
  });

  it("anniversaire des 26 ans HIER -> déjà 26 ans -> non éligible", () => {
    const dob = new Date(Date.UTC(2000, 8, 5)); // 5 septembre 2000
    const age = calculateAge(dob, REFERENCE_DATE);
    expect(age).toBe(26);
    expect(isEligibleForFreeTraining(age)).toBe(false);
  });

  it("ne calcule jamais un simple currentYear - birthYear (mois/jour ignorés serait faux)", () => {
    // Né le 31 décembre 2000 : n'a pas encore fêté ses 26 ans le 6 sept 2026.
    const dob = new Date(Date.UTC(2000, 11, 31));
    const age = calculateAge(dob, REFERENCE_DATE);
    expect(age).toBe(25); // et non 26 (2026 - 2000)
  });

  it("date de naissance 29 février (année bissextile)", () => {
    const dob = new Date(Date.UTC(2000, 1, 29)); // 29 février 2000
    // Référence : 28 février 2026 (non bissextile) -> anniversaire pas encore atteint.
    const beforeLeapDay = new Date(Date.UTC(2026, 1, 28));
    expect(calculateAge(dob, beforeLeapDay)).toBe(25);

    // Référence : 1er mars 2026 -> anniversaire considéré atteint.
    const afterLeapDay = new Date(Date.UTC(2026, 2, 1));
    expect(calculateAge(dob, afterLeapDay)).toBe(26);
  });
});

describe("ageEligibility.parseDateOfBirth (validation stricte du format)", () => {
  it("accepte une date ISO valide (AAAA-MM-JJ)", () => {
    const date = parseDateOfBirth("2001-09-06");
    expect(date.getUTCFullYear()).toBe(2001);
    expect(date.getUTCMonth()).toBe(8);
    expect(date.getUTCDate()).toBe(6);
  });

  it("rejette une date vide", () => {
    expect(() => parseDateOfBirth("")).toThrow(InvalidDateOfBirthError);
  });

  it("rejette une valeur non-string / undefined", () => {
    expect(() => parseDateOfBirth(undefined as any)).toThrow(InvalidDateOfBirthError);
  });

  it("rejette un format non-ISO", () => {
    expect(() => parseDateOfBirth("06/09/2001")).toThrow(InvalidDateOfBirthError);
  });

  it("rejette une date calendaire impossible (30 février)", () => {
    expect(() => parseDateOfBirth("2024-02-30")).toThrow(InvalidDateOfBirthError);
  });

  it("rejette une date future", () => {
    const futureYear = new Date().getUTCFullYear() + 1;
    expect(() => parseDateOfBirth(`${futureYear}-01-01`)).toThrow(InvalidDateOfBirthError);
  });

  it("rejette une date absurdement ancienne", () => {
    expect(() => parseDateOfBirth("1800-01-01")).toThrow(InvalidDateOfBirthError);
  });
});

describe("ageEligibility.calculateAgeFromString", () => {
  it("chaîne valide -> âge correct", () => {
    expect(calculateAgeFromString("2001-09-06", REFERENCE_DATE)).toBe(25);
  });

  it("chaîne invalide -> lève InvalidDateOfBirthError", () => {
    expect(() => calculateAgeFromString("invalid", REFERENCE_DATE)).toThrow(
      InvalidDateOfBirthError
    );
  });
});

describe("ageEligibility.isEligibleForFreeTraining / FREE_TRAINING_MAX_AGE", () => {
  it("la constante métier vaut 25", () => {
    expect(FREE_TRAINING_MAX_AGE).toBe(25);
  });

  it("24, 25 -> éligible ; 26 -> non éligible (limites exactes)", () => {
    expect(isEligibleForFreeTraining(24)).toBe(true);
    expect(isEligibleForFreeTraining(25)).toBe(true);
    expect(isEligibleForFreeTraining(26)).toBe(false);
  });
});
