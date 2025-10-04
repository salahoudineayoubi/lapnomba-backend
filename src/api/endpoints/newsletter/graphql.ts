import { gql } from "apollo-server-express";

export const newsletterTypeDefs = gql`
  type NewsletterSubscribe {
    id: ID!
    email: String!
    createdAt: String
    updatedAt: String
  }

  type Query {
    newsletterSubscribers: [NewsletterSubscribe!]!
    newsletterSubscriber(id: ID!): NewsletterSubscribe
  }

  type Mutation {
    createNewsletterSubscriber(email: String!): NewsletterSubscribe!
    updateNewsletterSubscriber(id: ID!, email: String!): NewsletterSubscribe!
    deleteNewsletterSubscriber(id: ID!): Boolean!
  }
`;