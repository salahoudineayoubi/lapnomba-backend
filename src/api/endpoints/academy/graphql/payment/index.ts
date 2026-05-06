import { gql } from "apollo-server-express";

export const academyPaymentTypeDefs = gql`
  type AcademyPayment {
    id: ID!
    enrollmentId: ID!
    applicationId: ID

    amount: Float!
    currency: String!

    paymentType: String!
    month: String

    method: String!
    status: String!

    provider: String
    providerTransactionId: String
    providerReference: String
    providerPaymentUrl: String

    paidAt: String
    note: String

    createdAt: String
    updatedAt: String
  }

  input AcademyPaymentInput {
    enrollmentId: ID!
    applicationId: ID

    amount: Float!
    currency: String
    paymentType: String
    month: String
    method: String!
    status: String

    provider: String
    providerTransactionId: String
    providerReference: String
    providerPaymentUrl: String
    paidAt: String
    note: String
  }

  input UpdateAcademyPaymentInput {
    id: ID!
    status: String
    providerTransactionId: String
    providerReference: String
    providerPaymentUrl: String
    paidAt: String
    note: String
  }

  input InitiateAcademyPaymentInput {
    enrollmentId: ID!
    method: String!
    paymentType: String!
    phone: String
    month: String
  }

  extend type Query {
    academyPayments: [AcademyPayment!]!
    academyPaymentById(id: ID!): AcademyPayment
    academyPaymentsByEnrollment(enrollmentId: ID!): [AcademyPayment!]!
  }

  extend type Mutation {
    createAcademyPayment(input: AcademyPaymentInput!): AcademyPayment!
    updateAcademyPayment(input: UpdateAcademyPaymentInput!): AcademyPayment!
    deleteAcademyPayment(id: ID!): Boolean!

    initiateAcademyPayment(input: InitiateAcademyPaymentInput!): AcademyPayment!
    verifyAcademyPayment(id: ID!): AcademyPayment!
  }
`;