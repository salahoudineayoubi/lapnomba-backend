import { gql } from "apollo-server-express";

export const projectSummitTypeDefs = gql`
  type ProjectSummit {
    id: ID!
    nomComplet: String!
    email: String!
    nomProjet: String!
    description: String!
    numeroWhatsapp: String!
    createdAt: String
    updatedAt: String
  }

  type Query {
    projectSummits: [ProjectSummit!]!
    projectSummit(id: ID!): ProjectSummit
  }

  type Mutation {
    createProjectSummit(
      nomComplet: String!
      email: String!
      nomProjet: String!
      description: String!
      numeroWhatsapp: String!
    ): ProjectSummit!

    updateProjectSummit(
      id: ID!
      nomComplet: String
      email: String
      nomProjet: String
      description: String
      numeroWhatsapp: String
    ): ProjectSummit!

    deleteProjectSummit(id: ID!): Boolean!
  }
`;