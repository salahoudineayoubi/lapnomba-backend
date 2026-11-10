import { gql } from "apollo-server-express";

export const talentRequestTypeDefs = gql`
  "Demande de recrutement d'une entreprise (talents.lapnomba.org)."
  type TalentRequest {
    id: ID!
    companyName: String!
    contactName: String!
    email: String!
    phone: String
    country: String
    roles: [String!]!
    seniority: String
    teamSize: Int
    engagement: String
    startDate: String
    message: String
    language: String
    "NEW | CONTACTED | IN_PROGRESS | WON | CLOSED"
    status: String!
    createdAt: String!
  }

  input TalentRequestInput {
    companyName: String!
    contactName: String!
    email: String!
    phone: String
    country: String
    "web_mobile | data_ai | cybersecurity | cloud_devops | design | digital_marketing | project_management | other"
    roles: [String!]!
    "junior | intermediate | senior | mixed"
    seniority: String
    teamSize: Int
    "full_time | part_time | project"
    engagement: String
    startDate: String
    message: String
    "Langue du site (fr | en | tr | ar)"
    language: String
  }

  type TalentRequestResponse {
    success: Boolean!
    message: String!
    id: ID
  }

  extend type Query {
    "ADMIN"
    talentRequests: [TalentRequest!]!
  }

  extend type Mutation {
    createTalentRequest(input: TalentRequestInput!): TalentRequestResponse!
    "ADMIN"
    updateTalentRequestStatus(id: ID!, status: String!): TalentRequest!
    "ADMIN"
    deleteTalentRequest(id: ID!): Boolean!
  }
`;
