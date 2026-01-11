import { gql } from "apollo-server-express";


export const partnerTypeDefs = gql`
  type Partner {
    id: ID!
    nomOrganisation: String!
    nomFondateur: String!
    emailCandidat: String!
    emailOfficiel: String!
    numeroContact: String!
    posteCandidat: String!
    presentationOrganisation: String!
    domaineAction: String!
    adresse: String!
    ville: String!
    pays: String!
    siteWeb: String
    urlLinkedin: String
    createdAt: String!
  }

  input CreatePartnerInput {
    nomOrganisation: String!
    nomFondateur: String!
    emailCandidat: String!
    emailOfficiel: String!
    numeroContact: String!
    posteCandidat: String!
    presentationOrganisation: String!
    domaineAction: String!
    adresse: String!
    ville: String!
    pays: String!
    siteWeb: String
    urlLinkedin: String
  }

  type Query {
    partners: [Partner!]!
    partner(id: ID!): Partner
  }

  type Mutation {
    createPartner(input: CreatePartnerInput!): Partner!
    deletePartner(id: ID!): Boolean!
  }
`;
