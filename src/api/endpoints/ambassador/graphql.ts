import { gql } from "apollo-server-express";

export const ambassadorTypeDefs = gql`

  type Ambassador {
    id: ID!
    nomComplet: String!
    age: Int
    pays: String!
    ville: String!
    email: String!
    whatsapp: String!
    platforms: [String!]
    profileLink: String!
    audienceSize: String
    contentTypes: String
    motivation: String!
    experience: String
    statut: String
    createdAt: String
  }

  input AmbassadorInput {
    nomComplet: String!
    age: Int
    pays: String!
    ville: String!
    email: String!
    whatsapp: String!
    platforms: [String!]
    profileLink: String!
    audienceSize: String
    contentTypes: String
    motivation: String!
    experience: String
  }

  type Query {
    # Retourne une liste vide au pire, mais jamais null
    ambassadors: [Ambassador!]!
    ambassadorById(id: ID!): Ambassador
  }

  type Mutation {
    createAmbassador(input: AmbassadorInput!): Ambassador!
    updateAmbassadorStatus(id: ID!, statut: String!): Ambassador!
    deleteAmbassador(id: ID!): Boolean!
  }
`;