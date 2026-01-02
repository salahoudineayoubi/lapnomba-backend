import { gql } from "apollo-server-express";

export const awarenessTypeDefs = gql`
type AwarenessAgent {
  id: ID!
  nomComplet: String!
  age: Int
  pays: String!
  ville: String!
  email: String!
  whatsapp: String!
  zoneIntervention: String!
  occupationActuelle: String
  experienceOratoire: String
  disponibiliteHebdo: String
  motivationTerrain: String!
  statut: String
  createdAt: String
}

input AwarenessAgentInput {
  nomComplet: String!
  age: Int
  pays: String!
  ville: String!
  email: String!
  whatsapp: String!
  zoneIntervention: String!
  occupationActuelle: String
  experienceOratoire: String
  disponibiliteHebdo: String
  motivationTerrain: String!
}

extend type Query {
  awarenessAgents: [AwarenessAgent!]!
}

extend type Mutation {
  createAwarenessAgent(input: AwarenessAgentInput!): AwarenessAgent!
  updateAwarenessAgentStatus(id: ID!, statut: String!): AwarenessAgent!
}
`;