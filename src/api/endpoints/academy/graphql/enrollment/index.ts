import { gql } from "apollo-server-express";

export const academyEnrollmentTypeDefs = gql`
  type AcademyEnrollment {
    id: ID!
    applicationId: ID!
    programId: ID

    studentName: String!
    email: String!
    phone: String!
    whatsapp: String

    selectedTrack: String!
    trainingMode: String!

    totalAmount: Float!
    monthlyPrice: Float!
    currency: String!

    paymentPlan: String!
    paymentStatus: String!

    startDate: String
    endDate: String

    groupId: ID

    status: String!

    progressPercent: Float!
    completedProjects: Int!
    attendanceRate: Float

    talentStatus: String!
    finalScore: Float

    adminNote: String

    createdAt: String
    updatedAt: String
  }

  input CreateAcademyEnrollmentInput {
    applicationId: ID!
    programId: ID

    studentName: String!
    email: String!
    phone: String!
    whatsapp: String

    selectedTrack: String!
    trainingMode: String!

    totalAmount: Float!
    monthlyPrice: Float
    currency: String
    paymentPlan: String

    startDate: String
    endDate: String
    groupId: ID
  }

  input UpdateAcademyEnrollmentInput {
    id: ID!
    paymentStatus: String
    status: String
    groupId: ID
    progressPercent: Float
    completedProjects: Int
    attendanceRate: Float
    talentStatus: String
    finalScore: Float
    adminNote: String
  }

  extend type Query {
    academyEnrollments: [AcademyEnrollment!]!
    academyEnrollmentById(id: ID!): AcademyEnrollment
    academyEnrollmentsByEmail(email: String!): [AcademyEnrollment!]!
  }

  extend type Mutation {
    createAcademyEnrollment(input: CreateAcademyEnrollmentInput!): AcademyEnrollment!
    updateAcademyEnrollment(input: UpdateAcademyEnrollmentInput!): AcademyEnrollment!
    deleteAcademyEnrollment(id: ID!): Boolean!
  }
`;