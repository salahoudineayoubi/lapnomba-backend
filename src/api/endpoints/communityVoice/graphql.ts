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
    "Texte d'origine, conservé quand une reformulation a été appliquée (admin)."
    originalComment: String
    createdAt: String
  }

  type VoiceRewrite {
    success: Boolean!
    message: String
    original: String
    suggestion: String
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
    "Propose une version corrigée (IA) de l'avis, sans rien enregistrer."
    suggestVoiceRewrite(id: ID!): VoiceRewrite!
    "Remplace le texte publié (le texte d'origine est conservé) ; publie l'avis si publish = true."
    applyVoiceRewrite(id: ID!, comment: String!, publish: Boolean): VoiceResponse!
  }
`;