import { gql } from "apollo-server-express";

export const academyProgramTypeDefs = gql`
  type AcademyProgram {
    id: ID!
    title: String!
    slug: String!
    description: String!
    category: String!
    durationMonths: Int!
    onlinePrice: Float!
    hybridPrice: Float
    onsitePrice: Float
    monthlyPrice: Float!
    currency: String!
    availableModes: [String!]!
    isJobPath: Boolean!
    jobPathNote: String
    isActive: Boolean!
    createdAt: String
    updatedAt: String
  }

  input AcademyProgramInput {
    title: String!
    slug: String!
    description: String!
    category: String!
    durationMonths: Int
    onlinePrice: Float!
    hybridPrice: Float
    onsitePrice: Float
    monthlyPrice: Float
    currency: String
    availableModes: [String!]
    isJobPath: Boolean
    jobPathNote: String
    isActive: Boolean
  }

  input UpdateAcademyProgramInput {
    id: ID!
    title: String
    slug: String
    description: String
    category: String
    durationMonths: Int
    onlinePrice: Float
    hybridPrice: Float
    onsitePrice: Float
    monthlyPrice: Float
    currency: String
    availableModes: [String!]
    isJobPath: Boolean
    jobPathNote: String
    isActive: Boolean
  }

  extend type Query {
    academyPrograms: [AcademyProgram!]!
    academyProgramById(id: ID!): AcademyProgram
    academyProgramBySlug(slug: String!): AcademyProgram
  }

  extend type Mutation {
    createAcademyProgram(input: AcademyProgramInput!): AcademyProgram!
    updateAcademyProgram(input: UpdateAcademyProgramInput!): AcademyProgram!
    deleteAcademyProgram(id: ID!): Boolean!
  }
`;