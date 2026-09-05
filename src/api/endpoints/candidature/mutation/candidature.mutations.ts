import { UserInputError } from "apollo-server-express";
import Candidature from "../../../../models/candidature";
import { handleFileUploads, sendStatusEmail } from "./candidature.helpers";
import { validateCandidatureInput, ValidationError } from "./candidature.validation";
import { FileValidationError } from "../../../../utils/fileValidation";
import { explainTransitionRejection, CandidatureStatut } from "./candidature.stateMachine";
import { requireAdmin, GraphQLContext, AdminTokenPayload } from "../../../../utils/auth";

/**
 * createCandidature — PUBLIC.
 * Seule opération de ce module accessible sans authentification.
 */
export const createCandidature = async (_: any, { input }: any) => {
  try {
    const validatedInput = validateCandidatureInput(input);
    const { photoUrl, cvUrl } = await handleFileUploads(validatedInput);

    const candidature = new Candidature({
      ...validatedInput,
      photo: photoUrl,
      cv: cvUrl,
      statut: "en attente",
      statusHistory: [],
    });

    await candidature.save();

    // Non bloquant : un échec SMTP ne doit jamais annuler/rollback la
    // candidature déjà enregistrée en base (voir sendStatusEmail).
    await sendStatusEmail(candidature.email, candidature.nomComplet, "CONFIRMATION");

    return candidature;
  } catch (error: any) {
    if (error.code === 11000) {
      throw new UserInputError("Cet email est déjà enregistré.");
    }

    if (error instanceof ValidationError || error instanceof FileValidationError) {
      throw new UserInputError(error.message);
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
