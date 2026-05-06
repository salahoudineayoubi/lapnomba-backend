import AcademyProgress from "../../../../../models/acdemy/progress";
import AcademyEnrollment from "../../../../../models/acdemy/enrollment";

export const academyProgressResolvers = {
  Query: {
    academyProgressByEnrollment: async (
      _: any,
      { enrollmentId }: { enrollmentId: string }
    ) => {
      return await AcademyProgress.findOne({ enrollmentId });
    },

    academyReadyForTalentPlatform: async () => {
      return await AcademyProgress.find({
        readyForTalentPlatform: true,
        transferredToTalentPlatform: false,
      }).sort({ updatedAt: -1 });
    },
  },

  Mutation: {
    updateAcademyProgress: async (_: any, { input }: any) => {
      const { enrollmentId, ...updates } = input;

      const progress = await AcademyProgress.findOneAndUpdate(
        { enrollmentId },
        updates,
        { new: true, upsert: true }
      );

      const progressPercent = updates.progressPercent;
      const completedProjects = updates.completedProjects;
      const finalScore = updates.finalScore;

      const enrollmentUpdates: any = {};

      if (progressPercent !== undefined) {
        enrollmentUpdates.progressPercent = progressPercent;
      }

      if (completedProjects !== undefined) {
        enrollmentUpdates.completedProjects = completedProjects;
      }

      if (finalScore !== undefined) {
        enrollmentUpdates.finalScore = finalScore;
      }

      if (updates.readyForTalentPlatform === true) {
        enrollmentUpdates.talentStatus = "eligible_talent_pool";
      }

      if (updates.transferredToTalentPlatform === true) {
        enrollmentUpdates.talentStatus = "transfere_talent_platform";
      }

      if (Object.keys(enrollmentUpdates).length > 0) {
        await AcademyEnrollment.findByIdAndUpdate(
          enrollmentId,
          enrollmentUpdates
        );
      }

      return progress;
    },

    markAcademyStudentReadyForTalent: async (
      _: any,
      { enrollmentId }: { enrollmentId: string }
    ) => {
      const enrollment = await AcademyEnrollment.findById(enrollmentId);

      if (!enrollment) {
        throw new Error("Inscription introuvable.");
      }

      const progress = await AcademyProgress.findOneAndUpdate(
        { enrollmentId },
        {
          readyForTalentPlatform: true,
          validatedByAdmin: true,
          validatedAt: new Date(),
        },
        { new: true, upsert: true }
      );

      await AcademyEnrollment.findByIdAndUpdate(enrollmentId, {
        talentStatus: "eligible_talent_pool",
        status: "validee",
      });

      return progress;
    },
  },
};