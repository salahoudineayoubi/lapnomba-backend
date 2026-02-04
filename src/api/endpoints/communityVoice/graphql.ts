import { gql } from "apollo-server-express";
export const communityVoiceTypeDefs = gql`

type CommunityVoice {
  id: ID!
  name: String!
  email: String
  rating: Int!
  comment: String!
  isApproved: Boolean!
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

  submitCommunityVoice(name: String!, email: String, rating: Int!, comment: String!): VoiceResponse!

  approveVoice(id: ID!): VoiceResponse!
  deleteVoice(id: ID!): VoiceResponse!
}
`;