import { gql } from "apollo-server-express";

export const candidatureTypeDefs = gql`
  type CandidatureStats {
    total: Int!
    enAttente: Int!
    approuvee: Int!
    refusee: Int!
  }

  type Candidature {
    id: ID!
    nomComplet: String!
    dateNaissance: String!
    sexe: String!
    adresse: String!
    ville: String!
    pays: String!
    numeroWhatsapp: String!
    email: String!
    photo: String
    niveauScolaire: String
    filiere: String
    ecole: String
    competences: String
    cv: String
    choixFormation: String!
    pourquoiFormation: String!
    ancienZaguina: String
    experienceZaguina: String
    typeFormation: String
    ordinateur: String
    niveauInformatique: String
    competencesCles: String
    accesInternet: String
    frequenceUtilisation: String
    createdAt: String
    updatedAt: String
    statut: String
  }

  input CandidatureInput {
    nomComplet: String!
    dateNaissance: String!
    sexe: String!
    adresse: String!
    ville: String!
    pays: String!
    numeroWhatsapp: String!
    email: String!
    photo: String
    niveauScolaire: String
    filiere: String
    ecole: String
    competences: String
    cv: String
    choixFormation: String!
    pourquoiFormation: String!
    ancienZaguina: String
    experienceZaguina: String
    typeFormation: String
    ordinateur: String
    niveauInformatique: String
    competencesCles: String
    accesInternet: String
    frequenceUtilisation: String
  }

  type Query {
    candidatures: [Candidature!]!
    candidatureById(id: ID!): Candidature

    # 🔥 NEW DASHBOARD STATS
    candidatureStats: CandidatureStats!
  }

  type Mutation {
    createCandidature(input: CandidatureInput!): Candidature!
    deleteCandidature(id: ID!): Boolean!
    approuverCandidature(id: ID!): Candidature!
    refuserCandidature(id: ID!): Candidature!
  }
`;