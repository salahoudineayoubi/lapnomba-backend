import { gql } from "apollo-server-express";

export const rootTypeDefs = gql`
  type Query {
    healthCheck: String
  }

  type Mutation {
    _empty: String
  }
`;