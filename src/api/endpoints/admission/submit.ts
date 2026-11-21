/**
 * Admissions v2 — création d'une candidature à partir d'une session vérifiée.
 *
 * Toutes les règles sont revérifiées ici (le site n'est qu'une aide) :
 * e-mail vérifié, âge, pièces d'identité, unicité de la pièce, test terminé,
 * réponses de motivation substantielles, charte signée, temps de remplissage humain.
 */
import crypto from "crypto";
import { ApolloError, UserInputError } from "apollo-server-express";

import Candidature from "../../../models/candidature";
import AcademyProgram from "../../../models/acdemy/program";
import { getSessionByToken, hashIdentityNumber } from "./session";
import { normalizeName } from "../../../utils/antiAbuse";
import { uploadPrivateDataUri } from "../../../utils/privateFiles";
import { validateUploadedFile } from "../../../utils/fileValidation";
import {
  calculateAgeFromString,
  isEligibleForFreeTraining,
  parseDateOfBirth,
  InvalidDateOfBirthError,
  MIN_APPLICATION_AGE,
  ADULT_AGE,
  FREE_TRAINING_MAX_AGE,
} from "../../../utils/ageEligibility";

// Mêmes codes que candidature.mutations.ts (dupliqués pour éviter un import circulaire).
const FREE_TRAINING_AGE_NOT_ELIGIBLE_CODE = "FREE_TRAINING_AGE_NOT_ELIGIBLE";
const MIN_AGE_NOT_MET_CODE = "MIN_AGE_NOT_MET";
import {
  validateEmail,
  validatePhone,
  validateRequiredText,
  trimOptional,
  ValidationError,
} from "../candidature/mutation/candidature.validation";

export const ID_TYPES = ["CNI", "PASSEPORT", "RECEPISSE_CNI", "ACTE_NAISSANCE", "CARTE_SCOLAIRE"] as const;
const MINOR_ONLY_TYPES = ["ACTE_NAISSANCE", "CARTE_SCOLAIRE"];
const MIN_FILL_SECONDS = 240; // en dessous de 4 min entre la vérification de l'e-mail et l'envoi : pas humain
const MOTIVATION_MIN = 150;
const MOTIVATION_MAX = 1200;

const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const knownProgram = async (title: string) =>
  AcademyProgram.exists({
    isActive: true,
    $or: [{ title: new RegExp(`^${escapeRegex(title.trim())}$`, "i") }, { slug: title.trim().toLowerCase() }],
  });

/** Numéro de pièce : chiffres pour la CNI (ancien ou nouveau format), alphanumérique sinon. */
export const normalizeIdNumber = (type: string, raw: string): string => {
  const v = String(raw || "").toUpperCase().replace(/[\s.\-/]/g, "");
  if (type === "CNI") {
    if (!/^\d{8,20}$/.test(v)) throw new ValidationError("Numéro de CNI invalide (8 à 20 chiffres).", "ID_NUMBER");
  } else if (type === "PASSEPORT") {
    if (!/^[A-Z0-9]{6,12}$/.test(v)) throw new ValidationError("Numéro de passeport invalide.", "ID_NUMBER");
  } else if (!/^[A-Z0-9]{5,25}$/.test(v)) {
    throw new ValidationError("Numéro du document invalide.", "ID_NUMBER");
  }
  return v;
};

/** Texte de motivation : longueur, vraies phrases, pas de copier-coller d'une réponse à l'autre. */
const validateMotivation = (value: string, label: string) => {
  const text = validateRequiredText(value, label, { min: MOTIVATION_MIN, max: MOTIVATION_MAX });
  const letters = (text.match(/\p{L}/gu) || []).length;
  const words = text.split(/\s+/).filter((w) => w.length > 1);
  const distinct = new Set(words.map((w) => w.toLowerCase()));
  if (letters < text.length * 0.6 || words.length < 25 || distinct.size < 15) {
    throw new ValidationError(`${label} : rédigez une vraie réponse, avec vos propres mots.`, "MOTIVATION");
  }
  return text;
};

const genReference = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[crypto.randomInt(0, alphabet.length)];
  return `LNF-${String(new Date().getFullYear()).slice(2)}-${s}`;
};

/** Score de présélection (0-100) : test 70 %, qualité des réponses écrites 30 %. Indicatif pour l'équipe. */
const computeScore = (aptitudePct: number, motivations: string[]) => {
  const writing = motivations.reduce((acc, m) => acc + Math.min(1, m.length / 600), 0) / motivations.length;
  return Math.round(aptitudePct * 0.7 + writing * 100 * 0.3);
};

export const createCandidatureV2 = async (input: any) => {
  const session = await getSessionByToken(input.sessionToken);
  if (session.submittedCandidatureId) throw new ApolloError("Votre candidature a déjà été envoyée.", "ALREADY_SUBMITTED");
  if (input.website && String(input.website).trim()) throw new ApolloError("Requête refusée.", "REJECTED");

  const elapsed = (Date.now() - new Date(session.verifiedAt!).getTime()) / 1000;
  if (elapsed < MIN_FILL_SECONDS) {
    throw new UserInputError("Prenez le temps de relire votre candidature avant de l'envoyer.", { reason: "TOO_FAST" });
  }

  // ---- Identité
  const email = validateEmail(session.email); // l'e-mail vérifié fait foi, jamais celui du formulaire
  const nomComplet = validateRequiredText(input.nomComplet, "Le nom complet", { min: 4, max: 150 });
  if (normalizeName(nomComplet).split(" ").length < 2) {
    throw new ValidationError("Indiquez votre nom complet (nom et prénom), comme sur votre pièce d'identité.", "NAME");
  }
  try {
    parseDateOfBirth(input.dateNaissance);
  } catch (err) {
    if (err instanceof InvalidDateOfBirthError) throw new ValidationError(err.message, "BIRTH_DATE");
    throw err;
  }
  const dateNaissance = String(input.dateNaissance).trim();
  const age = calculateAgeFromString(dateNaissance);
  if (age < MIN_APPLICATION_AGE) {
    throw new ApolloError(`Il faut avoir au moins ${MIN_APPLICATION_AGE} ans pour candidater.`, MIN_AGE_NOT_MET_CODE, { minAge: MIN_APPLICATION_AGE });
  }
  if (!isEligibleForFreeTraining(age)) {
    throw new ApolloError("Candidate exceeds free training age limit.", FREE_TRAINING_AGE_NOT_ELIGIBLE_CODE, { maxAge: FREE_TRAINING_MAX_AGE });
  }
  const isMinor = age < ADULT_AGE;
  const sexe = validateRequiredText(input.sexe, "Le sexe", { max: 30 });
  const numeroWhatsapp = validatePhone(input.numeroWhatsapp, "Le numéro WhatsApp");
  const pays = validateRequiredText(input.pays, "Le pays", { min: 2, max: 150 });
  const ville = validateRequiredText(input.ville, "La ville", { min: 2, max: 150 });
  const quartier = validateRequiredText(input.quartier, "Le quartier", { min: 2, max: 150 });
  const nationalite = validateRequiredText(input.nationalite, "La nationalité", { min: 2, max: 100 });

  // ---- Pièce d'identité
  const typePiece = String(input.typePiece || "");
  if (!(ID_TYPES as readonly string[]).includes(typePiece)) throw new ValidationError("Type de pièce d'identité invalide.", "ID_TYPE");
  if (MINOR_ONLY_TYPES.includes(typePiece) && !isMinor) {
    throw new ValidationError("À partir de 18 ans, une CNI, un récépissé de CNI ou un passeport est exigé.", "ID_TYPE");
  }
  const numero = normalizeIdNumber(typePiece, input.numeroPiece);
  const numeroHash = hashIdentityNumber(`${typePiece}:${numero}`);
  if (await Candidature.exists({ "identite.numeroHash": numeroHash, deletedAt: null })) {
    throw new UserInputError("Une candidature existe déjà avec cette pièce d'identité.", { reason: "DUPLICATE_ID" });
  }
  const docs = session.documents || {};
  const missing: string[] = [];
  if (!docs.front) missing.push("le recto de la pièce");
  if (typePiece === "CNI" || typePiece === "RECEPISSE_CNI") if (!docs.back) missing.push("le verso de la pièce");
  if (!docs.selfie) missing.push("le selfie");
  if (isMinor && !docs.guardian) missing.push("la pièce d'identité du parent ou tuteur");
  if (missing.length) throw new ValidationError(`Documents manquants : ${missing.join(", ")}.`, "ID_DOCS");

  // ---- Parcours & projet
  const niveauScolaire = validateRequiredText(input.niveauScolaire, "Le niveau d'études", { max: 100 });
  const ecole = validateRequiredText(input.ecole, "L'établissement", { min: 2, max: 200 });
  const choixFormation = validateRequiredText(input.choixFormation, "Le choix de formation", { max: 200 });
  if (!(await knownProgram(choixFormation))) throw new ValidationError("Formation inconnue.", "UNKNOWN_PROGRAM");
  const choixFormation2 = trimOptional(input.choixFormation2);
  if (choixFormation2) {
    if (choixFormation2.toLowerCase() === choixFormation.toLowerCase()) throw new ValidationError("Le second choix doit être différent du premier.", "PROGRAM_2");
    if (!(await knownProgram(choixFormation2))) throw new ValidationError("Second choix de formation inconnu.", "UNKNOWN_PROGRAM");
  }
  const motivationMetier = validateMotivation(input.motivationMetier, "Pourquoi ce métier");
  const motivationProbleme = validateMotivation(input.motivationProbleme, "Le problème à résoudre");
  const motivationEngagement = validateMotivation(input.motivationEngagement, "Votre engagement");
  const texts = [motivationMetier, motivationProbleme, motivationEngagement].map((t) => t.toLowerCase());
  if (new Set(texts).size < 3) throw new ValidationError("Chaque réponse de motivation doit être différente.", "MOTIVATION");
  const disponibiliteHeures = Number(input.disponibiliteHeures);
  if (!Number.isInteger(disponibiliteHeures) || disponibiliteHeures < 1 || disponibiliteHeures > 60) {
    throw new ValidationError("Indiquez votre disponibilité en heures par semaine.", "AVAILABILITY");
  }
  const lienProfil = trimOptional(input.lienProfil);
  if (lienProfil && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(lienProfil)) throw new ValidationError("Lien de profil invalide.", "PROFILE_LINK");

  // ---- Test d'aptitude
  const apt = session.aptitude;
  if (!apt?.submittedAt || apt.total === undefined || apt.score === undefined) {
    throw new ValidationError("Le test d'aptitude doit être terminé avant l'envoi.", "APTITUDE");
  }
  const pourcentage = Math.round((apt.score / Math.max(1, apt.total)) * 100);

  // ---- Charte & consentements
  if (input.consentementDonnees !== true) throw new ValidationError("Vous devez accepter le traitement de vos données pour candidater.", "DATA_CONSENT_REQUIRED");
  if (isMinor && input.autorisationParentale !== true) throw new ValidationError("L'autorisation d'un parent ou tuteur est obligatoire avant 18 ans.", "PARENTAL_CONSENT_REQUIRED");
  if (normalizeName(input.charteNom) !== normalizeName(nomComplet)) {
    throw new ValidationError("Pour signer la charte, recopiez exactement votre nom complet.", "CHARTER");
  }

  // ---- CV facultatif, stocké en privé
  let cv: string | undefined;
  if (typeof input.cv === "string" && input.cv.startsWith("data:")) {
    validateUploadedFile(input.cv, { allowedMimes: ["application/pdf"], maxBytes: 5 * 1024 * 1024, label: "CV" });
    cv = await uploadPrivateDataUri(input.cv, { folder: `admissions/cv/${session._id}`, resourceType: "raw", format: "pdf" });
  }

  let reference = genReference();
  for (let i = 0; i < 5 && (await Candidature.exists({ reference })); i++) reference = genReference();

  const candidature = new Candidature({
    applicationVersion: 2,
    reference,
    nomComplet,
    dateNaissance,
    sexe,
    email,
    numeroWhatsapp,
    pays,
    ville,
    quartier,
    nationalite,
    photo: docs.selfie,
    niveauScolaire,
    filiere: trimOptional(input.filiere),
    ecole,
    cv,
    lienProfil,
    choixFormation,
    choixFormation2,
    pourquoiFormation: motivationMetier,
    motivationMetier,
    motivationProbleme,
    motivationEngagement,
    disponibiliteHeures,
    typeFormation: trimOptional(input.typeFormation),
    ordinateur: trimOptional(input.ordinateur),
    niveauInformatique: trimOptional(input.niveauInformatique),
    accesInternet: trimOptional(input.accesInternet),
    frequenceUtilisation: trimOptional(input.frequenceUtilisation),
    identite: {
      typePiece,
      numeroHash,
      numeroFin: numero.slice(-4),
      documents: { ...docs },
      statut: "a_verifier",
    },
    aptitude: { score: apt.score, total: apt.total, pourcentage, dureeSecondes: apt.durationSeconds, termineLe: apt.submittedAt },
    charte: { nomSaisi: String(input.charteNom).trim(), signeeLe: new Date() },
    scoreGlobal: computeScore(pourcentage, [motivationMetier, motivationProbleme, motivationEngagement]),
    consentementDonnees: true,
    consentementDonneesAt: new Date(),
    autorisationParentale: isMinor ? true : undefined,
    statut: "en attente",
    statusHistory: [],
  });
  await candidature.save();

  session.submittedCandidatureId = String(candidature._id);
  session.draft = undefined;
  await session.save();

  return { candidature, age };
};
