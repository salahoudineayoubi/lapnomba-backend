import { AwarenessModel } from "../../../models/awareness";

export const awarenessResolvers = {
  Query: {
    awarenessList: async () => AwarenessModel.find().lean(),
    awareness: async (_: any, { id }: { id: string }) =>
      AwarenessModel.findById(id).lean(),
  },
  Mutation: {
    createAwareness: async (_: any, args: any) => {
      const awareness = new AwarenessModel({ ...args });
      return (await awareness.save()).toObject();
    },
    updateAwareness: async (_: any, { id, ...fields }: any) => {
      const awareness = await AwarenessModel.findByIdAndUpdate(id, fields, { new: true });
      if (!awareness) throw new Error("Sensibilisation non trouvée");
      return awareness.toObject();
    },
    deleteAwareness: async (_: any, { id }: { id: string }) => {
      const result = await AwarenessModel.deleteOne({ _id: id });
      return result.deletedCount !== 0;
    },
  },
};