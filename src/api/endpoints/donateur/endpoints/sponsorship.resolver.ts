import { SponsorshipModel } from "../../../../models/sponsorship";

export const sponsorshipResolvers = {
  Mutation: {
    createSponsorship: async (_: any, { input }: any) => {
      const sponsorship = await SponsorshipModel.create({
        sponsorName: input.sponsorName,
        sponsorEmail: input.sponsorEmail,
        sponsorPhone: input.sponsorPhone,
        duration: input.duration,
        studentName: input.studentName,
        studentId: input.studentId,
        monthlyReport: input.monthlyReport ?? true,
        status: "ACTIVE",
      });

      return sponsorship;
    },
  },
};