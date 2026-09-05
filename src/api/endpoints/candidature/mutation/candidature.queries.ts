import Candidature from "../../../../models/candidature";
import { requireAdmin, GraphQLContext } from "../../../../utils/auth";

const NOT_DELETED = { deletedAt: null };

/* ==============================
   LISTE DES CANDIDATURES — ADMIN ONLY
   Conservée non paginée pour compatibilité avec le frontend existant.
============================== */
export const candidatures = async (_: any, __: any, context: GraphQLContext) => {
  requireAdmin(context);

  return await Candidature.find(NOT_DELETED).sort({ createdAt: -1 });
};

/* ==============================
   LISTE PAGINÉE — ADMIN ONLY
============================== */
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;

export const candidaturesPaginated = async (
  _: any,
  { page, limit, statut, search }: { page?: number; limit?: number; statut?: string; search?: string },
  context: GraphQLContext
) => {
  requireAdmin(context);

  const safePage = Math.max(1, page ?? 1);
  const safeLimit = Math.min(MAX_PAGE_LIMIT, Math.max(1, limit ?? DEFAULT_PAGE_LIMIT));

  const filter: Record<string, any> = { ...NOT_DELETED };

  if (statut) {
    filter.statut = statut;
  }

  if (search?.trim()) {
    const term = search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ nomComplet: regex }, { email: regex }];
  }

  const [items, total] = await Promise.all([
    Candidature.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    Candidature.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
};

/* ==============================
   CANDIDATURE BY ID — ADMIN ONLY
============================== */
export const candidatureById = async (
  _: any,
  { id }: { id: string },
  context: GraphQLContext
) => {
  requireAdmin(context);

  return await Candidature.findOne({ _id: id, ...NOT_DELETED });
};

/* ==============================
   STATS DASHBOARD ONG — ADMIN ONLY
============================== */
export const candidatureStats = async (_: any, __: any, context: GraphQLContext) => {
  requireAdmin(context);

  const stats = await Candidature.aggregate([
    { $match: NOT_DELETED },
    {
      $group: {
        _id: "$statut",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    enAttente: 0,
    approuvee: 0,
    refusee: 0,
  };

  stats.forEach((s) => {
    result.total += s.count;

    if (s._id === "en attente") {
      result.enAttente = s.count;
    }

    if (s._id === "approuvée") {
      result.approuvee = s.count;
    }

    if (s._id === "refusée") {
      result.refusee = s.count;
    }
  });

  return result;
};
