import { gql } from "apollo-server-express";

export const candidatureTypeDefs = gql`
  type Candidature {
    id: ID!
    photo: String
    sexe: String!
    dateNaissance: String!
    adresse: String!
    ville: String!
    pays: String!
    nomComplet: String!
    numeroWhatsapp: String!
    email: String!
    occupation: String!
    niveauScolaire: String
    filiere: String
    ecole: String
    etudeTerminee: String
    besoinStage: String
    periodeStage: String
    competences: String
    cv: String
    choixFormation: String!
    pourquoiFormation: String!
    objectifsFormation: String!
    avenir5ans: String!
    ancienZaguina: String
    experienceZaguina: String
    motivation: String
    engagement: String
    heuresParSemaine: String
    createdAt: String
    updatedAt: String
  }

  input CandidatureInput {
    photo: String
    sexe: String!
    dateNaissance: String!
    adresse: String!
    ville: String!
    pays: String!
    nomComplet: String!
    numeroWhatsapp: String!
    email: String!
    occupation: String!
    niveauScolaire: String
    filiere: String
    ecole: String
    etudeTerminee: String
    besoinStage: String
    periodeStage: String
    competences: String
    cv: String
    choixFormation: String!
    pourquoiFormation: String!
    objectifsFormation: String!
    avenir5ans: String!
    ancienZaguina: String
    experienceZaguina: String
    motivation: String
    engagement: String
    heuresParSemaine: String
  }

  type Query {
    candidatures: [Candidature!]!
    candidature(id: ID!): Candidature
  }

  type Mutation {
    createCandidature(input: CandidatureInput!): Candidature!
    deleteCandidature(id: ID!): Boolean!
  }
`;