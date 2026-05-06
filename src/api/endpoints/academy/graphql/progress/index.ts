import { gql } from "apollo-server-express";

export const academyProgressTypeDefs = gql`
  type AcademyProgress {
    id: ID!
    enrollmentId: ID!

    progressPercent: Float!
    completedModules: Int!
    completedProjects: Int!

    attendanceRate: Float

    technicalScore: Float
    softSkillScore: Float
    finalScore: Float

    portfolioUrl: String
    githubUrl: String
    cvUrl: String

    validatedByAdmin: Boolean!
    validatedAt: String

    readyForTalentPlatform: Boolean!
    transferredToTalentPlatform: Boolean!

    note: String

    createdAt: String
    updatedAt: String
  }

  input UpdateAcademyProgressInput {
    enrollmentId: ID!

    progressPercent: Float
    completedModules: Int
    completedProjects: Int
    attendanceRate: Float

    technicalScore: Float
    softSkillScore: Float
    finalScore: Float

    portfolioUrl: String
    githubUrl: String
    cvUrl: String

    validatedByAdmin: Boolean
    readyForTalentPlatform: Boolean
    transferredToTalentPlatform: Boolean

    note: String
  }

  extend type Query {
    academyProgressByEnrollment(enrollmentId: ID!): AcademyProgress
    academyReadyForTalentPlatform: [AcademyProgress!]!
  }

  extend type Mutation {
    updateAcademyProgress(input: UpdateAcademyProgressInput!): AcademyProgress!
    markAcademyStudentReadyForTalent(enrollmentId: ID!): AcademyProgress!
  }
`;