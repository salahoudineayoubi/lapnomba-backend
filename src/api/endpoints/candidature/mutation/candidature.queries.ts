import Candidature from "../../../../models/candidature";

/* ==============================
   LISTE DES CANDIDATURES
============================== */
export const candidatures = async () => {
  return await Candidature.find().sort({ createdAt: -1 });
};

/* ==============================
   CANDIDATURE BY ID
============================== */
export const candidatureById = async (
  _: any,
  { id }: { id: string }
) => {
  return await Candidature.findById(id);
};

/* ==============================
   STATS DASHBOARD ONG
============================== */
export const candidatureStats = async () => {
  const stats = await Candidature.aggregate([
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