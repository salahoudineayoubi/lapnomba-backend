import { gql } from "apollo-server-express";

export const materialTypeDefs = gql`
  type Material {
    id: ID!
    nom: String!
    telephone: String
    email: String
    typeMateriel: String!
    quantite: Int!
    details: String
    etatMateriel: MaterialCondition
    modeLivraison: MaterialDeliveryMode
    adresse: String
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  enum MaterialCondition {
    NEW
    VERY_GOOD
    GOOD
    REPAIRABLE
    FOR_RECYCLING
  }

  enum MaterialDeliveryMode {
    DROP_OFF
    PICKUP
    SHIPPING
  }

  input CreateMaterialInput {
    nom: String!
    telephone: String
    email: String
    typeMateriel: String!
    quantite: Int!
    details: String
    etatMateriel: MaterialCondition
    modeLivraison: MaterialDeliveryMode
    adresse: String
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