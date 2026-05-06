import { gql } from "apollo-server-express";

export const academyStatsTypeDefs = gql`
  type AcademyStats {
    programs: Int!
    applications: Int!
    enrollments: Int!
    activeEnrollments: Int!
    completedEnrollments: Int!
    paymentsCompleted: Int!
    paymentsPending: Int!
    totalRevenue: Float!
    readyForTalentPlatform: Int!
  }

  extend type Query {
    academyStats: AcademyStats!
  }
`;