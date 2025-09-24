// import { gql } from "apollo-server-express";

// const typeDefs = gql`
//   #################################
//   # TYPES UTILISATEURS
//   #################################

//   type User {
//     id: ID!
//     firstName: String!
//     lastName: String
//     email: String!
//     phone: String
//     address: String
//     role: String!      # customer, seller, forwarder, admin
//     createdAt: String!
//   }

//   type Customer {
//     id: ID!
//     user: User!
//     createdAt: String!
//   }

//   type Supplier {
//     id: ID!
//     user: User!
//     companyName: String!
//     contact: String
//     region: String
//     createdAt: String!
//   }

//   type Forwarder {
//     id: ID!
//     user: User!
//     companyName: String!
//     licenseNumber: String
//     region: String
//     createdAt: String!
//   }

//   type Admin {
//     id: ID!
//     user: User!
//     role: String!
//     createdAt: String!
//   }

//   #################################
//   # INPUTS
//   #################################

//   input CreateUserInput {
//     firstName: String!
//     lastName: String
//     email: String!
//     phone: String
//     address: String
//     password: String!
//   }

//   input UpdateUserInput {
//     firstName: String
//     lastName: String
//     email: String
//     phone: String
//     address: String
//     password: String
//   }

//   #################################
//   # AUTH INPUTS
//   #################################
//   input LoginInput {
//     email: String!
//     password: String!
//   }

//   type AuthPayload {
//     token: String!
//     user: User!
//   }

//   #################################
//   # QUERIES
//   #################################
//   type Query {
//     # Users
//     users: [User!]!
//     user(id: ID!): User

//     # Customers
//     customers: [Customer!]!
//     customer(id: ID!): Customer

//     # Suppliers
//     suppliers: [Supplier!]!
//     supplier(id: ID!): Supplier

//     # Forwarders
//     forwarders: [Forwarder!]!
//     forwarder(id: ID!): Forwarder

//     # Admins
//     admins: [Admin!]!
//     admin(id: ID!): Admin

//     # Auth
//     me: User
//   }

//   #################################
//   # MUTATIONS
//   #################################
//   type Mutation {
//     # Users
//     createUser(input: CreateUserInput!): User!
//     updateUser(id: ID!, input: UpdateUserInput!): User!
//     deleteUser(id: ID!): Boolean!

//     # Auth
//     login(input: LoginInput!): AuthPayload!
//     logout: Boolean!

//     # Upgrade Roles
//     createSupplier(userId: ID!, companyName: String!, contact: String, region: String): Supplier!
//     createForwarder(userId: ID!, companyName: String!, licenseNumber: String, region: String): Forwarder!
//     createAdmin(userId: ID!, role: String!): Admin!
//   }
// `;

// export default typeDefs;
