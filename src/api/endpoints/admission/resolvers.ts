import { UserInputError } from "apollo-server-express";

import Candidature from "../../../models/candidature";
import { requireAdmin, GraphQLContext } from "../../../utils/auth";
import { checkRateLimit } from "../../../utils/rateLimiter";
import { getPrivateFileUrl, isPrivateRef } from "../../../utils/privateFiles";
import {
  applicationSession,
  requestApplicationCode,
  saveApplicationDraft,
  uploadIdentityDocument,
  verifyApplicationCode,
} from "./session";
import { startAptitudeTest, submitAptitudeAnswers } from "./aptitude";

const signedIfAdmin = (ref: string | undefined, context?: GraphQLContext) =>
  ref && isPrivateRef(ref) && context?.admin ? getPrivateFileUrl(ref) : null;

const applicationTracking = async (
  _: any,
  { reference, email }: { reference: string; email: string },
  context?: GraphQLContext
) => {
  if (context?.ip) checkRateLimit(`appTracking:${context.ip}`, { maxRequests: 20, windowMs: 3600 * 1000 });
  const c: any = await Candidature.findOne({
    reference: String(reference || "").trim().toUpperCase(),
    email: String(email || "").trim().toLowerCase(),
    deletedAt: null,
  }).lean();
  if (!c) return null;
  return {
    reference: c.reference,
    statut: c.statut,
    choixFormation: c.choixFormation,
    createdAt: new Date(c.createdAt).toISOString(),
    prenom: String(c.nomComplet || "").trim().split(/\s+/).slice(-1)[0] || "",
    identiteVerifiee: c.identite?.statut === "verifiee",
  };
};

const verifierIdentiteCandidature = async (
  _: any,
  { id, statut, note }: { id: string; statut: string; note?: string },
  context?: GraphQLContext
) => {
  const admin = requireAdmin(context);
  if (!["verifiee", "rejetee"].includes(statut)) throw new UserInputError("Statut invalide (verifiee | rejetee).");
  if (statut === "rejetee" && !note?.trim()) throw new UserInputError("Indiquez le motif du rejet de la pièce.");
  const c = await Candidature.findOne({ _id: id, deletedAt: null });
  if (!c || !c.identite) throw new UserInputError("Candidature sans vérification d'identité.");
  c.identite.statut = statut as any;
  c.identite.note = note?.trim() || undefined;
  c.identite.verifieePar = (admin as any).email || (admin as any).id || "admin";
  c.identite.verifieeLe = new Date();
  c.markModified("identite");
  await c.save();
  return c;
};

export const admissionResolvers = {
  Candidature: {
    // Les fichiers privés ne sont jamais exposés au public : liens signés pour l'admin uniquement.
    photo: (p: any, _: any, ctx: GraphQLContext) => (isPrivateRef(p.photo) ? signedIfAdmin(p.photo, ctx) : p.photo ?? null),
    cv: (p: any, _: any, ctx: GraphQLContext) => (isPrivateRef(p.cv) ? signedIfAdmin(p.cv, ctx) : p.cv ?? null),
    charteSigneeLe: (p: any) => (p.charte?.signeeLe ? new Date(p.charte.signeeLe).toISOString() : null),
    identite: (p: any, _: any, ctx: GraphQLContext) => {
      // Anciennes candidatures (formulaire v1) : Mongoose renvoie un objet « identite » vide
      // (sous-documents imbriqués) sans pièce d'identité → pas de bloc identité.
      if (!p.identite?.typePiece || !ctx?.admin) return null;
      const d = p.identite.documents || {};
      return {
        typePiece: p.identite.typePiece,
        numeroFin: p.identite.numeroFin,
        statut: p.identite.statut || "a_verifier",
        note: p.identite.note,
        verifieePar: p.identite.verifieePar,
        verifieeLe: p.identite.verifieeLe ? new Date(p.identite.verifieeLe).toISOString() : null,
        purgee: !!p.identite.purgedAt,
        documents: {
          front: signedIfAdmin(d.front, ctx),
          back: signedIfAdmin(d.back, ctx),
          selfie: signedIfAdmin(d.selfie, ctx),
          guardian: signedIfAdmin(d.guardian, ctx),
          birth: signedIfAdmin(d.birth, ctx),
        },
      };
    },
    aptitude: (p: any, _: any, ctx: GraphQLContext) => (ctx?.admin && p.aptitude?.total ? p.aptitude : null),
    scoreGlobal: (p: any, _: any, ctx: GraphQLContext) => (ctx?.admin ? p.scoreGlobal ?? null : null),
  },
  Query: {
    applicationSession,
    applicationTracking,
  },
  Mutation: {
    requestApplicationCode,
    verifyApplicationCode,
    saveApplicationDraft,
    uploadIdentityDocument,
    startAptitudeTest,
    submitAptitudeAnswers,
    verifierIdentiteCandidature,
  },
};
