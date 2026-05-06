import AcademyProgram from "../../../../../models/acdemy/program";

export const academyProgramResolvers = {
  Query: {
    academyPrograms: async () => {
      return await AcademyProgram.find().sort({ createdAt: -1 });
    },

    academyProgramById: async (_: any, { id }: { id: string }) => {
      return await AcademyProgram.findById(id);
    },

    academyProgramBySlug: async (_: any, { slug }: { slug: string }) => {
      return await AcademyProgram.findOne({ slug });
    },
  },

  Mutation: {
    createAcademyProgram: async (_: any, { input }: any) => {
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

    updateAcademyProgram: async (_: any, { input }: any) => {
      const { id, ...updates } = input;

      const program = await AcademyProgram.findByIdAndUpdate(id, updates, {
        new: true,
      });

      if (!program) {
        throw new Error("Programme introuvable.");
      }

      return program;
    },

    deleteAcademyProgram: async (_: any, { id }: { id: string }) => {
      const deleted = await AcademyProgram.findByIdAndDelete(id);
      return !!deleted;
    },
  },
};