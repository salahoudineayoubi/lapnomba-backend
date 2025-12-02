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
    engagement: Boolean
    heuresParSemaine: String
    typeFormation: String
    disponible: String
    contraintesDisponibilite: String
    ordinateur: String
    ordinateurComment: String
    internet: String
    internetComment: String
    smartphone: String
    smartphoneComment: String
    createdAt: String
    updatedAt: String
    statut: String
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
    engagement: Boolean
    heuresParSemaine: String
    typeFormation: String
    disponible: String
    contraintesDisponibilite: String
    ordinateur: String
    ordinateurComment: String
    internet: String
    internetComment: String
    smartphone: String
    smartphoneComment: String
  }

  type Query {
    candidatures: [Candidature!]!
    candidature(id: ID!): Candidature
  }

  type Mutation {
    createCandidature(input: CandidatureInput!): Candidature!
    deleteCandidature(id: ID!): Boolean!
    approuverCandidature(id: ID!): Candidature!
    refuserCandidature(id: ID!): Candidature!
  }
`;