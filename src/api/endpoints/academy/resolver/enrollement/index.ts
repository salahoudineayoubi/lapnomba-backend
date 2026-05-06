import AcademyEnrollment from "../../../../../models/acdemy/enrollment";
import AcademyApplication from "../../../../../models/acdemy/application";
import AcademyProgress from "../../../../../models/acdemy/progress";

export const academyEnrollmentResolvers = {
  Query: {
    academyEnrollments: async () => {
      return await AcademyEnrollment.find().sort({ createdAt: -1 });
    },

    academyEnrollmentById: async (_: any, { id }: { id: string }) => {
      return await AcademyEnrollment.findById(id);
    },

    academyEnrollmentsByEmail: async (_: any, { email }: { email: string }) => {
      return await AcademyEnrollment.find({
        email: email.toLowerCase().trim(),
      }).sort({ createdAt: -1 });
    },
  },

  Mutation: {
    createAcademyEnrollment: async (_: any, { input }: any) => {
      const enrollment = new AcademyEnrollment({
        ...input,
        currency: input.currency || "XAF",
        monthlyPrice: input.monthlyPrice || 30000,
        paymentPlan: input.paymentPlan || "monthly",
        paymentStatus: "en_attente",
        status: "active",
        progressPercent: 0,
        completedProjects: 0,
        talentStatus: "non_eligible",
      });

      await enrollment.save();

      await AcademyProgress.create({
        enrollmentId: enrollment._id,
      });

      if (input.applicationId) {
        await AcademyApplication.findByIdAndUpdate(input.applicationId, {
          status: "convertie_en_inscription",
        });
      }

      return enrollment;
    },

    updateAcademyEnrollment: async (_: any, { input }: any) => {
      const { id, ...updates } = input;

      const enrollment = await AcademyEnrollment.findByIdAndUpdate(
        id,
        updates,
        { new: true }
      );

      if (!enrollment) {
        throw new Error("Inscription Academy introuvable.");
      }

      return enrollment;
    },

    deleteAcademyEnrollment: async (_: any, { id }: { id: string }) => {
      await AcademyProgress.findOneAndDelete({ enrollmentId: id });

      const deleted = await AcademyEnrollment.findByIdAndDelete(id);
      return !!deleted;
    },
  },
};