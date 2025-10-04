import { gql } from "apollo-server-express";

export const joinTeamRequestTypeDefs = gql`
  type JoinTeamRequest {
    id: ID!
    nomComplet: String!
    email: String!
    numeroWhatsapp: String!
    message: String!
    profession: String!
    createdAt: String
    updatedAt: String
  }

  type Query {
    joinTeamRequests: [JoinTeamRequest!]!
    joinTeamRequest(id: ID!): JoinTeamRequest
  }

  type Mutation {
    createJoinTeamRequest(
      nomComplet: String!
      email: String!
      numeroWhatsapp: String!
      message: String!
      profession: String!
    ): JoinTeamRequest!

    updateJoinTeamRequest(
      id: ID!
      nomComplet: String
      email: String
      numeroWhatsapp: String
      message: String
      profession: String
    ): JoinTeamRequest!

    deleteJoinTeamRequest(id: ID!): Boolean!
  }
`;