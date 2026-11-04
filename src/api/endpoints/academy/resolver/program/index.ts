import AcademyProgram from "../../../../../models/acdemy/program";
import { requireAdmin, GraphQLContext } from "../../../../../utils/auth";

export const academyProgramResolvers = {
  Query: {
    // Catalogue public — consommé par le site Academy (catalogue, détail
    // programme, sélecteur de formation). Ne retourne que des programmes
    // actifs pour un appel non-admin (voir Phase 3, "Canonical Catalog").
    academyPrograms: async (_: any, __: any, context: GraphQLContext) => {
      const filter = context?.admin ? {} : { isActive: true };
      return await AcademyProgram.find(filter).sort({ displayOrder: 1, createdAt: 1 });
    },

    academyProgramById: async (_: any, { id }: { id: string }) => {
      return await AcademyProgram.findById(id);
    },

    academyProgramBySlug: async (_: any, { slug }: { slug: string }) => {
      return await AcademyProgram.findOne({ slug });
    },
  },

  Mutation: {
    createAcademyProgram: async (_: any, { input }: any, context: GraphQLContext) => {
      requireAdmin(context);

      const exists = await AcademyProgram.findOne({ slug: input.slug });

      if (exists) {
        throw new Error("Un programme avec ce slug existe déjà.");
      }

      const program = new AcademyProgram({
        ...input,
        currency: input.currency || "XAF",
        durationMonths: input.durationMonths || 12,
        monthlyPrice: input.monthlyPrice || 30000,
        isActive: input.isActive ?? true,
        isJobPath: input.isJobPath ?? true,
      });

      await program.save();
      return program;
    },

    updateAcademyProgram: async (_: any, { input }: any, context: GraphQLContext) => {
      requireAdmin(context);

      const { id, ...updates } = input;

      if (updates.slug) {
        const exists = await AcademyProgram.findOne({ slug: updates.slug, _id: { $ne: id } });
        if (exists) {
          throw new Error("Un programme avec ce slug existe déjà.");
        }
      }

      const program = await AcademyProgram.findByIdAndUpdate(id, updates, {
        new: true,
      });

      if (!program) {
        throw new Error("Programme introuvable.");
      }

      return program;
    },

    deleteAcademyProgram: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      requireAdmin(context);
      const deleted = await AcademyProgram.findByIdAndDelete(id);
      return !!deleted;
    },
  },
};