import { gql } from "apollo-server-express";

export const materialTypeDefs = gql`
  type Material {
    id: ID!
    nom: String!
    telephone: String!
    email: String
    typeMateriel: String!
    etatMateriel: String!
    quantite: Int!
    modeLivraison: String!
    adresse: String
    details: String
    createdAt: String!
  }

  input CreateMaterialInput {
    nom: String!
    telephone: String!
    email: String
    typeMateriel: String!
    etatMateriel: String!
    quantite: Int!
    modeLivraison: String!
    adresse: String
    details: String
  }

  type Query {
    materials: [Material!]!
    material(id: ID!): Material
  }

  type Mutation {
    createMaterial(input: CreateMaterialInput!): Material!
    deleteMaterial(id: ID!): Boolean!
  }
`;