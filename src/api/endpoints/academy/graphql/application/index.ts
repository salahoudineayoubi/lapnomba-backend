import { gql } from "apollo-server-express";

export const academyApplicationTypeDefs = gql`
  type AcademyApplication {
    id: ID!
    applicantType: String!

    fullName: String!
    email: String!
    phone: String!
    whatsapp: String
    country: String!
    city: String

    organizationName: String
    organizationType: String
    position: String
    website: String

    programId: ID
    selectedTrack: String!
    trainingMode: String!
    numberOfParticipants: Int!
    preferredStartDate: String
    learningGoal: String!
    currentLevel: String

    requiresQuote: Boolean!
    estimatedBudget: String
    quoteUrl: String

    expectedAmount: Float
    monthlyPrice: Float
    currency: String!

    understandsImpactModel: Boolean!
    impactNote: String

    status: String!
    adminNote: String

    createdAt: String
    updatedAt: String
  }

  input AcademyApplicationInput {
    applicantType: String!

    fullName: String!
    email: String!
    phone: String!
    whatsapp: String
    country: String!
    city: String

    organizationName: String
    organizationType: String
    position: String
    website: String

    programId: ID
    selectedTrack: String!
    trainingMode: String!
    numberOfParticipants: Int
    preferredStartDate: String
    learningGoal: String!
    currentLevel: String

    requiresQuote: Boolean
    estimatedBudget: String

    expectedAmount: Float
    monthlyPrice: Float
    currency: String

    understandsImpactModel: Boolean
  }

  input UpdateAcademyApplicationInput {
    id: ID!
    status: String
    adminNote: String
    quoteUrl: String
    requiresQuote: Boolean
    expectedAmount: Float
    monthlyPrice: Float
    currency: String
  }

  extend type Query {
    academyApplications: [AcademyApplication!]!
    academyApplicationById(id: ID!): AcademyApplication
  }

  extend type Mutation {
    createAcademyApplication(input: AcademyApplicationInput!): AcademyApplication!
    updateAcademyApplication(input: UpdateAcademyApplicationInput!): AcademyApplication!
    deleteAcademyApplication(id: ID!): Boolean!
    approveAcademyApplication(id: ID!): AcademyEnrollment!
  }
`;