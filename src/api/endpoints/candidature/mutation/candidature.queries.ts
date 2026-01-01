import Candidature from "../../../../models/candidature";

export const candidatures = async () => {
  return await Candidature.find().sort({ createdAt: -1 });
};

export const candidatureById = async (_: any, { id }: { id: string }) => {
  return await Candidature.findById(id);
};