import { gql } from "apollo-server-express";

export const talentProfileTypeDefs = gql`
  type TalentVetting {
    training: Boolean!
    projects: Boolean!
    technicalAssessment: Boolean!
    softSkills: Boolean!
  }

  "Profil de talent affiché sur talents.lapnomba.org. fullName, email, phone, notes : admin uniquement."
  type TalentProfile {
    id: ID!
    slug: String!
    displayName: String!
    fullName: String
    email: String
    phone: String
    photo: String
    headline: String!
    headlineI18n: LocalizedText
    bio: String
    bioI18n: LocalizedText
    "web_mobile | data_ai | cybersecurity | cloud_devops | design | digital_marketing | project_management | other"
    expertise: String!
    skills: [String!]!
    "junior | intermediate | senior"
    seniority: String
    yearsExperience: Int
    city: String
    country: String
    "available | soon | unavailable"
    availability: String!
    "full_time | part_time | project"
    engagements: [String!]!
    spokenLanguages: [String!]!
    trainingProgram: String
    vetting: TalentVetting!
    portfolioUrl: String
    githubUrl: String
    linkedinUrl: String
    notes: String
    consentObtained: Boolean
    published: Boolean!
    featured: Boolean!
    order: Int!
    createdAt: String!
    updatedAt: String!
  }

  input TalentVettingInput {
    training: Boolean
    projects: Boolean
    technicalAssessment: Boolean
    softSkills: Boolean
  }

  input TalentProfileInput {
    displayName: String
    fullName: String
    email: String
    phone: String
    "data URI (téléversée sur Cloudinary) ou URL https"
    photo: String
    headline: String
    headlineI18n: LocalizedTextInput
    bio: String
    bioI18n: LocalizedTextInput
    expertise: String
    skills: [String!]
    seniority: String
    yearsExperience: Int
    city: String
    country: String
    availability: String
    engagements: [String!]
    spokenLanguages: [String!]
    trainingProgram: String
    vetting: TalentVettingInput
    portfolioUrl: String
    githubUrl: String
    linkedinUrl: String
    notes: String
    consentObtained: Boolean
    published: Boolean
    featured: Boolean
    order: Int
  }

  extend type Query {
    "Profils publiés (site talents). Filtres facultatifs."
    talentProfiles(expertise: String, seniority: String, availability: String, featured: Boolean, limit: Int): [TalentProfile!]!
    talentProfile(slug: String!): TalentProfile
    "ADMIN : tous les profils, publiés ou non."
    adminTalentProfiles: [TalentProfile!]!
  }

  extend type Mutation {
    "ADMIN"
    createTalentProfile(input: TalentProfileInput!): TalentProfile!
    "ADMIN"
    updateTalentProfile(id: ID!, input: TalentProfileInput!): TalentProfile!
    "ADMIN"
    deleteTalentProfile(id: ID!): Boolean!
  }
`;
