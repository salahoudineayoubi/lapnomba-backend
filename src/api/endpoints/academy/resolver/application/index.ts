import AcademyApplication from "../../../../../models/acdemy/application";
import AcademyEnrollment from "../../../../../models/acdemy/enrollment";
import AcademyProgress from "../../../../../models/acdemy/progress";
import AcademyProgram from "../../../../../models/acdemy/program";

const getAmountByMode = (program: any, mode: string) => {
  if (!program) return 0;

  if (mode === "online") return program.onlinePrice || 500000;

  if (mode === "hybrid") return program.hybridPrice || 800000;

  if (mode === "onsite") {
    return program.onsitePrice || program.hybridPrice || 800000;
  }

  return 0;
};

export const academyApplicationResolvers = {
  Query: {
    academyApplications: async () => {
      return await AcademyApplication.find().sort({ createdAt: -1 });
    },

    academyApplicationById: async (_: any, { id }: { id: string }) => {
      return await AcademyApplication.findById(id);
    },
  },

  Mutation: {
    createAcademyApplication: async (_: any, { input }: any) => {
      let program = null;

      if (input.programId) {
        program = await AcademyProgram.findById(input.programId);
      }

      const isOrganization =
        input.applicantType === "entreprise" || input.applicantType === "ong";

      const isCustom = input.trainingMode === "custom";

      const requiresQuote =
        input.requiresQuote ?? (isOrganization || isCustom);

      const expectedAmount =
        input.expectedAmount ??
        getAmountByMode(program, input.trainingMode);

      const application = new AcademyApplication({
        ...input,
        requiresQuote,
        expectedAmount,
        monthlyPrice: input.monthlyPrice ?? program?.monthlyPrice ?? 30000,
        currency: input.currency || "XAF",
        status: "nouvelle",
        understandsImpactModel: input.understandsImpactModel ?? true,
      });

      await application.save();

      return application;
    },

    updateAcademyApplication: async (_: any, { input }: any) => {
      const { id, ...updates } = input;

      const application = await AcademyApplication.findByIdAndUpdate(
        id,
        updates,
        { new: true }
      );

      if (!application) {
        throw new Error("Candidature Academy introuvable.");
      }

      return application;
    },

    deleteAcademyApplication: async (_: any, { id }: { id: string }) => {
      const deleted = await AcademyApplication.findByIdAndDelete(id);
      return !!deleted;
    },

    approveAcademyApplication: async (_: any, { id }: { id: string }) => {
      const application = await AcademyApplication.findById(id);

      if (!application) {
        throw new Error("Candidature Academy introuvable.");
      }

      const existingEnrollment = await AcademyEnrollment.findOne({
        applicationId: application._id,
      });

      if (existingEnrollment) {
        return existingEnrollment;
      }

      const enrollment = new AcademyEnrollment({
        applicationId: application._id,
        programId: application.programId,

        studentName: application.fullName,
        email: application.email,
        phone: application.phone,
        whatsapp: application.whatsapp,

        selectedTrack: application.selectedTrack,
        trainingMode: application.trainingMode,

        totalAmount: application.expectedAmount || 0,
        monthlyPrice: application.monthlyPrice || 30000,
        currency: application.currency || "XAF",

        paymentPlan: "monthly",
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

      application.status = "convertie_en_inscription";
      await application.save();

      return enrollment;
    },
  },
};