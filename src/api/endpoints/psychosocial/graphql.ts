import { gql } from "apollo-server-express";


 export const PsychosocialTypeDefs = gql`
type Psychosocial {
  id: ID!
  nomComplet: String!
  age: Int
  pays: String!
  ville: String!
  email: String!
  whatsapp: String!
  specialite: String!
  experienceAccompagnement: String
  motivationZaguina: String!
  disponibilite: String
  statut: String
  createdAt: String
}

input PsychosocialInput {
  nomComplet: String!
  age: Int
  pays: String!
  ville: String!
  email: String!
  whatsapp: String!
  specialite: String!
  experienceAccompagnement: String
  motivationZaguina: String!
  disponibilite: String
}

extend type Query {
  psychosocials: [Psychosocial!]!
}

extend type Mutation {
  createPsychosocial(input: PsychosocialInput!): Psychosocial!
  updatePsychosocialStatus(id: ID!, statut: String!): Psychosocial!
}


`;