import { gql } from "apollo-server-express";

export const mentorTypeDefs = gql`
  enum MentorDomain {
    DEVOPS_CLOUD
    DATA
    AI
    CYBERSECURITY
    WEB_MOBILE
    UX_UI
  }

  enum MentorApplicationStatus {
    PENDING
    ACCEPTED
    REJECTED
  }

  type MentorApplication {
    id: ID!
    fullName: String!
    email: String!
    phone: String!
    domain: MentorDomain!
    yearsExperience: Int!
    linkedinUrl: String
    motivation: String!
    hoursPerMonth: Int!
    status: MentorApplicationStatus!
    createdAt: String!
  }

  input CreateMentorApplicationInput {
    fullName: String!
    email: String!
    phone: String!
    domain: MentorDomain!
    yearsExperience: Int!
    linkedinUrl: String
    motivation: String!
    hoursPerMonth: Int!
  }

  extend type Query {
    mentorApplications: [MentorApplication!]!
  }

  extend type Mutation {
    createMentorApplication(input: CreateMentorApplicationInput!): MentorApplication!
    updateMentorApplicationStatus(id: ID!, status: MentorApplicationStatus!): MentorApplication!
  }
`;
