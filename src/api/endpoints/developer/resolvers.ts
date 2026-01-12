import Developer from "../../../models/developer";

export const developerResolvers = {
  Query: {
    developers: async () => {
      return await Developer.find().sort({ createdAt: -1 });
    },
    developer: async (_: any, { id }: { id: string }) => {
      return await Developer.findById(id);
    },
  },
  Mutation: {
    createDeveloper: async (_: any, { input }: any) => {
      const developer = new Developer(input);
      await developer.save();
      return developer;
    },
    deleteDeveloper: async (_: any, { id }: { id: string }) => {
      const res = await Developer.findByIdAndDelete(id);
      return !!res;
    },
  },
};