import { gql } from "apollo-server-express";

export const candidatureTypeDefs = gql`
  type CandidatureStats {
    total: Int!
    enAttente: Int!
    approuvee: Int!
    refusee: Int!
  }

  type StatusHistoryEntry {
    from: String!
    to: String!
    changedAt: String!
    changedBy: String!
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
    motifRefus: String
    statusHistory: [StatusHistoryEntry!]!
  }

  type CandidaturePage {
    items: [Candidature!]!
    total: Int!
    page: Int!
    limit: Int!
    totalPages: Int!
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
    # Admin only — conservée non paginée pour compatibilité avec l'existant.
    candidatures: [Candidature!]!

    # Admin only — pagination + filtre statut/recherche.
    candidaturesPaginated(page: Int, limit: Int, statut: String, search: String): CandidaturePage!

    candidatureById(id: ID!): Candidature

    # 🔥 NEW DASHBOARD STATS
    candidatureStats: CandidatureStats!
  }

  type Mutation {
    # Public — seule route accessible sans authentification.
    createCandidature(input: CandidatureInput!): Candidature!

    # Admin only ci-dessous.
    deleteCandidature(id: ID!): Boolean!
    approuverCandidature(id: ID!): Candidature!
    refuserCandidature(id: ID!, motifRefus: String): Candidature!
  }
`;