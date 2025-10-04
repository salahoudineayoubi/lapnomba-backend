import { gql } from "apollo-server-express";

export const adminTypeDefs = gql`
  type AdminLoginResponse {
    success: Boolean!
    message: String
    error: String
  }

  type Mutation {
    adminLogin(email: String!, password: String!): AdminLoginResponse!
  }
`;