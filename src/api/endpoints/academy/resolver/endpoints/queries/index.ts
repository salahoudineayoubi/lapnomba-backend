// api/endpoints/academy/academy.queries.ts
import AcademyApplication from "../../../../../../models/academy";

export const academyApplications = async () => {
  return await AcademyApplication.find().sort({ createdAt: -1 });
};

export const academyApplicationById = async (_: any, { id }: { id: string }) => {
  return await AcademyApplication.findById(id);
};

export const academyApplicationStats = async () => {
  const statusStats = await AcademyApplication.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const typeStats = await AcademyApplication.aggregate([
    { $group: { _id: "$applicantType", count: { $sum: 1 } } },
  ]);

  const result = {
    total: 0,
    nouvelle: 0,
    enEtude: 0,
    devisEnvoye: 0,
    approuvee: 0,
    refusee: 0,
    inscrite: 0,
    terminee: 0,
    professionnels: 0,
    entreprises: 0,
    ong: 0,
    diaspora: 0,
  };

  statusStats.forEach((s) => {
    result.total += s.count;

    if (s._id === "nouvelle") result.nouvelle = s.count;
    if (s._id === "en_etude") result.enEtude = s.count;
    if (s._id === "devis_envoye") result.devisEnvoye = s.count;
    if (s._id === "approuvee") result.approuvee = s.count;
    if (s._id === "refusee") result.refusee = s.count;
    if (s._id === "inscrite") result.inscrite = s.count;
    if (s._id === "terminee") result.terminee = s.count;
  });

  typeStats.forEach((t) => {
    if (t._id === "professionnel") result.professionnels = t.count;
    if (t._id === "entreprise") result.entreprises = t.count;
    if (t._id === "ong") result.ong = t.count;
    if (t._id === "diaspora") result.diaspora = t.count;
  });

  return result;
};