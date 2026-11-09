import { gql } from "apollo-server-express";

export const communityVoiceTypeDefs = gql`
  type CommunityVoice {
    id: ID!
    name: String!
    email: String
    rating: Int!
    comment: String!
    isApproved: Boolean!
    "Langue d'origine du commentaire (fr | en | tr | ar)."
    language: String
    "Traductions du commentaire saisies depuis l'admin."
    commentI18n: LocalizedText
    createdAt: String
  }

  type VoiceResponse {
    success: Boolean!
    message: String
  }

  extend type Query {
    getApprovedVoices: [CommunityVoice!]!
    getAllVoicesForAdmin: [CommunityVoice!]!
  }

  extend type Mutation {
    submitCommunityVoice(
      name: String!
      email: String
      rating: Int!
      comment: String!
    ): VoiceResponse!

    approveVoice(id: ID!): VoiceResponse!
    updateVoiceTranslations(id: ID!, language: String, commentI18n: LocalizedTextInput): VoiceResponse!
    deleteVoice(id: ID!): VoiceResponse!
  }
`;