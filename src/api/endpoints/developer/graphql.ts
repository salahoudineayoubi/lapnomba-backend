import { gql } from "apollo-server-express";

export const developerTypeDefs = gql`
  type Developer {
    id: ID!
    nomComplet: String!
    emailProfessionnel: String!
    portfolio: String
    domaineExpertise: String!
    motivation: String
    disponible4h: Boolean!
    createdAt: String!
  }

  input CreateDeveloperInput {
    nomComplet: String!
    emailProfessionnel: String!
    portfolio: String
    domaineExpertise: String!
    motivation: String
    disponible4h: Boolean!
  }

  type Query {
    developers: [Developer!]!
    developer(id: ID!): Developer
  }

  type Mutation {
    createDeveloper(input: CreateDeveloperInput!): Developer!
    deleteDeveloper(id: ID!): Boolean!
  }
`;