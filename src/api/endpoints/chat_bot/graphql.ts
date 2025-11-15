import { gql } from "apollo-server-express";

export const chatbotTypeDefs = gql`
  type Query {
    _empty: String
  }

  type Mutation {
    chatbotPrompt(prompt: String!): String!
  }
`;