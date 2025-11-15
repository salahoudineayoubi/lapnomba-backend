import { gql } from "apollo-server-express";

export const awarenessTypeDefs = gql`
  type Awareness {
    id: ID!
    titre: String!
    description: String!
    imageUrl: String
    videoUrl: String
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    awarenessList: [Awareness!]!
    awareness(id: ID!): Awareness
  }

  type Mutation {
    createAwareness(
      titre: String!
      description: String!
      imageUrl: String
      videoUrl: String
    ): Awareness!

    updateAwareness(
      id: ID!
      titre: String
      description: String
      imageUrl: String
      videoUrl: String
    ): Awareness!

    deleteAwareness(id: ID!): Boolean!
  }
`;