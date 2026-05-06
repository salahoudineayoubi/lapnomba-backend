import AcademyGroup from "../../../../../models/acdemy/groupe";
import AcademyEnrollment from "../../../../../models/acdemy/enrollment";

export const academyGroupResolvers = {
  Query: {
    academyGroups: async () => {
      return await AcademyGroup.find().sort({ createdAt: -1 });
    },

    academyGroupById: async (_: any, { id }: { id: string }) => {
      return await AcademyGroup.findById(id);
    },
  },

  Mutation: {
    createAcademyGroup: async (_: any, { input }: any) => {
      const group = new AcademyGroup({
        ...input,
        currentStudents: 0,
        isActive: input.isActive ?? true,
      });

      await group.save();
      return group;
    },

    updateAcademyGroup: async (_: any, { input }: any) => {
      const { id, ...updates } = input;

      const group = await AcademyGroup.findByIdAndUpdate(id, updates, {
        new: true,
      });

      if (!group) {
        throw new Error("Groupe Academy introuvable.");
      }

      return group;
    },

    deleteAcademyGroup: async (_: any, { id }: { id: string }) => {
      const hasStudents = await AcademyEnrollment.exists({ groupId: id });

      if (hasStudents) {
        throw new Error(
          "Impossible de supprimer ce groupe : des apprenants y sont déjà assignés."
        );
      }

      const deleted = await AcademyGroup.findByIdAndDelete(id);
      return !!deleted;
    },
  },
};