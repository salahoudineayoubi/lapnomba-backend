import AcademyProgram from "../../../../../models/acdemy/program";
import AcademyApplication from "../../../../../models/acdemy/application";
import AcademyEnrollment from "../../../../../models/acdemy/enrollment";
import AcademyPayment from "../../../../../models/acdemy/payment";
import AcademyProgress from "../../../../../models/acdemy/progress";

export const academyStatsResolvers = {
  Query: {
    academyStats: async () => {
      const [
        programs,
        applications,
        enrollments,
        activeEnrollments,
        completedEnrollments,
        paymentsCompleted,
        paymentsPending,
        readyForTalentPlatform,
        revenue,
      ] = await Promise.all([
        AcademyProgram.countDocuments(),
        AcademyApplication.countDocuments(),
        AcademyEnrollment.countDocuments(),
        AcademyEnrollment.countDocuments({ status: "active" }),
        AcademyEnrollment.countDocuments({ status: "terminee" }),
        AcademyPayment.countDocuments({ status: "completed" }),
        AcademyPayment.countDocuments({ status: "pending" }),
        AcademyProgress.countDocuments({
          readyForTalentPlatform: true,
          transferredToTalentPlatform: false,
        }),
        AcademyPayment.aggregate([
          { $match: { status: "completed" } },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]),
      ]);

      return {
        programs,
        applications,
        enrollments,
        activeEnrollments,
        completedEnrollments,
        paymentsCompleted,
        paymentsPending,
        totalRevenue: revenue[0]?.total || 0,
        readyForTalentPlatform,
      };
    },
  },
};