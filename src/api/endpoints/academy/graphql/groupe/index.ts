import { gql } from "apollo-server-express";

export const academyGroupTypeDefs = gql`
  type AcademyGroup {
    id: ID!
    name: String!
    selectedTrack: String!
    level: String
    trainingMode: String!

    whatsappLink: String!

    maxStudents: Int!
    currentStudents: Int!

    startDate: String
    endDate: String

    trainerIds: [ID!]

    isActive: Boolean!

    createdAt: String
    updatedAt: String
  }

  input AcademyGroupInput {
    name: String!
    selectedTrack: String!
    level: String
    trainingMode: String!
    whatsappLink: String!
    maxStudents: Int
    startDate: String
    endDate: String
    trainerIds: [ID!]
    isActive: Boolean
  }

  input UpdateAcademyGroupInput {
    id: ID!
    name: String
    selectedTrack: String
    level: String
    trainingMode: String
    whatsappLink: String
    maxStudents: Int
    currentStudents: Int
    startDate: String
    endDate: String
    trainerIds: [ID!]
    isActive: Boolean
  }

  extend type Query {
    academyGroups: [AcademyGroup!]!
    academyGroupById(id: ID!): AcademyGroup
  }

  extend type Mutation {
    createAcademyGroup(input: AcademyGroupInput!): AcademyGroup!
    updateAcademyGroup(input: UpdateAcademyGroupInput!): AcademyGroup!
    deleteAcademyGroup(id: ID!): Boolean!
  }
`;