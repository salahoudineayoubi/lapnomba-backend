
import { gql } from "apollo-server-express";

export const academyTypeDefs = gql`
  type AcademyApplicationStats {
    total: Int!
    nouvelle: Int!
    enEtude: Int!
    devisEnvoye: Int!
    approuvee: Int!
    refusee: Int!
    inscrite: Int!
    terminee: Int!
    professionnels: Int!
    entreprises: Int!
    ong: Int!
    diaspora: Int!
  }

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

    selectedTrack: String!
    trainingMode: String!
    numberOfParticipants: Int
    preferredStartDate: String
    learningGoal: String!
    currentLevel: String

    requiresQuote: Boolean!
    estimatedBudget: String
    paymentMethod: String
    paymentStatus: String!
    amount: Float
    currency: String
    invoiceUrl: String
    quoteUrl: String

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

    selectedTrack: String!
    trainingMode: String
    numberOfParticipants: Int
    preferredStartDate: String
    learningGoal: String!
    currentLevel: String

    requiresQuote: Boolean
    estimatedBudget: String
    paymentMethod: String
    amount: Float
    currency: String

    understandsImpactModel: Boolean
  }

  input UpdateAcademyApplicationStatusInput {
    id: ID!
    status: String!
    adminNote: String
  }

  input UpdateAcademyPaymentInput {
    id: ID!
    paymentStatus: String!
    paymentMethod: String
    amount: Float
    currency: String
    invoiceUrl: String
    quoteUrl: String
  }

  type Query {
    academyApplications: [AcademyApplication!]!
    academyApplicationById(id: ID!): AcademyApplication
    academyApplicationStats: AcademyApplicationStats!
  }

  type Mutation {
    createAcademyApplication(input: AcademyApplicationInput!): AcademyApplication!
    updateAcademyApplicationStatus(input: UpdateAcademyApplicationStatusInput!): AcademyApplication!
    updateAcademyPayment(input: UpdateAcademyPaymentInput!): AcademyApplication!
    deleteAcademyApplication(id: ID!): Boolean!
  }
`;