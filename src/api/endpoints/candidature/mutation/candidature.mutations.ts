import { UserInputError, ApolloError } from "apollo-server-express";
import Candidature from "../../../../models/candidature";
import { handleFileUploads, sendStatusEmail, sendInternalNotification } from "./candidature.helpers";
import { validateCandidatureInput, ValidationError } from "./candidature.validation";
import AcademyProgram from "../../../../models/acdemy/program";
import logger from "../../../../utils/logger";
import { FileValidationError } from "../../../../utils/fileValidation";
import { explainTransitionRejection, CandidatureStatut } from "./candidature.stateMachine";
import { requireAdmin, GraphQLContext, AdminTokenPayload } from "../../../../utils/auth";
import {
  calculateAgeFromString,
  isEligibleForFreeTraining,
  FREE_TRAINING_MAX_AGE,
  MIN_APPLICATION_AGE,
  ADULT_AGE,
} from "../../../../utils/ageEligibility";
import { checkRateLimit, RateLimitExceededError } from "../../../../utils/rateLimiter";

export const FREE_TRAINING_AGE_NOT_ELIGIBLE_CODE = "FREE_TRAINING_AGE_NOT_ELIGIBLE";
export const MIN_AGE_NOT_MET_CODE = "MIN_AGE_NOT_MET";

// 5 soumissions / 15 min / IP : n'affecte jamais un candidat normal (une
// seule soumission), freine la soumission automatisée en masse.
const CREATE_CANDIDATURE_RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 };

/**
 * createCandidature — PUBLIC.
 * Seule opération de ce module accessible sans authentification.
 *
 * L'orientation ">25 ans → Academy" est décidée EARLY côté frontend (avant
 * même que l'utilisateur ne remplisse les 3 étapes suivantes), mais cette
 * vérification frontend n'est qu'une aide UX — elle est rejouée ici,
 * intégralement, côté serveur. Un appel direct à cette mutation avec un
 * candidat de plus de 25 ans est rejeté AVANT tout upload de fichier et
 * AVANT toute écriture en base : aucune candidature "refusée" n'est créée
 * pour ce cas, ce n'est pas un refus de candidature, c'est une orientation
 * de parcours qui n'a jamais dû produire de candidature.
 */
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Le programme choisi doit exister dans le catalogue de l'Academy (actif),
 * identifié par son titre ou son slug (insensible à la casse). Évite les
 * candidatures pour des formations qui ne sont pas proposées.
 */
const ensureKnownAcademyProgram = async (choixFormation: string) => {
  const value = choixFormation.trim();
  const exact = new RegExp(`^${escapeRegex(value)}$`, "i");
  const found = await AcademyProgram.exists({
    isActive: true,
    $or: [{ title: exact }, { slug: value.toLowerCase() }],
  });
  if (!found) {
    throw new ValidationError(
      "Cette formation n'est pas proposée actuellement. Choisissez une formation dans la liste.",
      "UNKNOWN_PROGRAM"
    );
  }
};

export const createCandidature = async (_: any, { input }: any, context?: GraphQLContext) => {
  try {
    if (context?.ip) {
      checkRateLimit(`createCandidature:${context.ip}`, CREATE_CANDIDATURE_RATE_LIMIT);
    }

    const validatedInput = validateCandidatureInput(input);

    // Transition : l'ancien site admissions n'envoie ni les consentements ni
    // le titre exact du programme. Tant qu'il est en ligne, ses candidatures
    // sont acceptées comme avant ; le nouveau formulaire (qui envoie
    // toujours consentementDonnees) est soumis aux règles complètes.
    // À retirer une fois le nouveau site admissions déployé.
    const isLegacyClient = input?.consentementDonnees === undefined || input?.consentementDonnees === null;
    if (isLegacyClient) {
      logger.warn("Candidature reçue d'un ancien client (sans consentement) : règles de transition appliquées.");
    } else {
      await ensureKnownAcademyProgram(validatedInput.choixFormation);
    }

    const age = calculateAgeFromString(validatedInput.dateNaissance);

    if (age < MIN_APPLICATION_AGE) {
      throw new ApolloError(
        `Il faut avoir au moins ${MIN_APPLICATION_AGE} ans pour candidater.`,
        MIN_AGE_NOT_MET_CODE,
        { minAge: MIN_APPLICATION_AGE }
      );
    }

    if (!isEligibleForFreeTraining(age)) {
      throw new ApolloError(
        "Candidate exceeds free training age limit.",
        FREE_TRAINING_AGE_NOT_ELIGIBLE_CODE,
        { maxAge: FREE_TRAINING_MAX_AGE }
      );
    }

    // Consentements (RGPD / données de mineurs) : obligatoires, horodatés.
    if (!isLegacyClient && input?.consentementDonnees !== true) {
      throw new ValidationError(
        "Vous devez accepter le traitement de vos données pour candidater.",
        "DATA_CONSENT_REQUIRED"
      );
    }
    if (!isLegacyClient && age < ADULT_AGE && input?.autorisationParentale !== true) {
      throw new ValidationError(
        "L'autorisation d'un parent ou tuteur est obligatoire avant 18 ans.",
        "PARENTAL_CONSENT_REQUIRED"
      );
    }

    const { photoUrl, cvUrl } = await handleFileUploads(validatedInput);

    const candidature = new Candidature({
      ...validatedInput,
      photo: photoUrl,
      cv: cvUrl,
      statut: "en attente",
      statusHistory: [],
      consentementDonnees: isLegacyClient ? undefined : true,
      consentementDonneesAt: isLegacyClient ? undefined : new Date(),
      autorisationParentale: !isLegacyClient && age < ADULT_AGE ? true : undefined,
    });

    await candidature.save();

    // Non bloquant : un échec SMTP ne doit jamais annuler/rollback la
    // candidature déjà enregistrée en base (voir sendStatusEmail).
    await sendStatusEmail(candidature.email, candidature.nomComplet, "CONFIRMATION");
    await sendInternalNotification(candidature, age);

    return candidature;
  } catch (error: any) {
    if (error.code === 11000) {
      throw new UserInputError("Cet email est déjà enregistré.", { reason: "DUPLICATE_EMAIL" });
    }

    if (error instanceof ValidationError) {
      throw new UserInputError(error.message, { reason: error.reason ?? "INVALID_INPUT" });
    }

    if (error instanceof FileValidationError) {
      throw new UserInputError(error.message, { reason: "INVALID_FILE" });
    }

    if (error instanceof RateLimitExceededError) {
      throw new ApolloError(error.message, "RATE_LIMITED");
    }

    throw error;
  }
};

/**
 * Applique une transition de statut de façon atomique (findOneAndUpdate
 * conditionné sur le statut de départ attendu) : deux admins qui traitent
 * la même candidature en même temps, ou un double-clic/rejeu réseau, ne
 * peuvent produire qu'un seul changement effectif — l'autre appel tombe
 * dans la branche "déjà traité" ci-dessous, AVANT tout envoi d'email.
 */
const applyStatusTransition = async (
  id: string,
  targetStatut: Exclude<CandidatureStatut, "en attente">,
  admin: AdminTokenPayload,
  extra: { motifRefus?: string } = {}
) => {
  const fromStatut: CandidatureStatut = "en attente";

  const update: Record<string, any> = {
    $set: { statut: targetStatut },
    $push: {
      statusHistory: {
        from: fromStatut,
        to: targetStatut,
        changedAt: new Date(),
        changedBy: admin.email,
      },
    },
  };

  if (targetStatut === "refusée" && extra.motifRefus !== undefined) {
    update.$set.motifRefus = extra.motifRefus;
  }

  const candidature = await Candidature.findOneAndUpdate(
    { _id: id, statut: fromStatut, deletedAt: null },
    update,
    { new: true }
  );

  if (candidature) {
    return candidature;
  }

  // Aucun document modifié : soit introuvable/supprimée, soit déjà traitée.
  // On relit l'état réel pour renvoyer un message métier précis plutôt
  // qu'un échec générique.
  const existing = await Candidature.findById(id);

  if (!existing || existing.deletedAt) {
    throw new UserInputError("Candidature introuvable.");
  }

  throw new UserInputError(
    explainTransitionRejection(existing.statut as CandidatureStatut, targetStatut)
  );
};

/**
 * approuverCandidature — ADMIN ONLY.
 * Transition autorisée uniquement depuis "en attente".
 */
export const approuverCandidature = async (
  _: any,
  { id }: { id: string },
  context: GraphQLContext
) => {
  const admin = requireAdmin(context);
  const candidature = await applyStatusTransition(id, "approuvée", admin);

  // La transition en base a réussi de façon atomique : un seul appel peut
  // arriver jusqu'ici pour un même id → un seul email envoyé.
  await sendStatusEmail(candidature.email, candidature.nomComplet, "APPROBATION");

  return candidature;
};

/**
 * refuserCandidature — ADMIN ONLY.
 * Transition autorisée uniquement depuis "en attente".
 * `motifRefus` est optionnel, transmis par l'admin ; injecté dans l'email
 * de refus s'il est fourni, et stocké sur la candidature.
 */
export const refuserCandidature = async (
  _: any,
  { id, motifRefus }: { id: string; motifRefus?: string },
  context: GraphQLContext
) => {
  const admin = requireAdmin(context);
  const trimmedMotif = motifRefus?.trim() || undefined;
  const candidature = await applyStatusTransition(id, "refusée", admin, { motifRefus: trimmedMotif });

  await sendStatusEmail(candidature.email, candidature.nomComplet, "REFUS", trimmedMotif);

  return candidature;
};

/**
 * deleteCandidature — ADMIN ONLY.
 * Soft-delete : la candidature reste en base (traçabilité) mais disparaît
 * des listes/exports. Aucune utilisation active de cette mutation n'a été
 * trouvée côté frontend admin au moment du durcissement (mutation définie
 * mais jamais appelée depuis un composant) — le changement de comportement
 * ne casse donc rien d'observable aujourd'hui.
 */
export const deleteCandidature = async (
  _: any,
  { id }: { id: string },
  context: GraphQLContext
) => {
  const admin = requireAdmin(context);

  const res = await Candidature.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: admin.email } },
    { new: true }
  );

  return !!res;
};
