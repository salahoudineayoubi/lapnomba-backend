import Partner from "../../../models/partners";

export const partnerResolvers  = {
  Query: {
    partners: async () => {
      return await Partner.find().sort({ createdAt: -1 });
    },
    partner: async (_: any, { id }: { id: string }) => {
      return await Partner.findById(id);
    },
  },
  Mutation: {
    createPartner: async (_: any, { input }: any) => {
      const partner = new Partner(input);
      await partner.save();
      return partner;
    },
    deletePartner: async (_: any, { id }: { id: string }) => {
      const res = await Partner.findByIdAndDelete(id);
      return !!res;
    },
  },
};