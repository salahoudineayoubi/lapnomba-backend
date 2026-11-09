import { gql } from "apollo-server-express";

// Arguments facultatifs côté schéma pour rester compatible avec le formulaire
// /students-register du site principal ; ils sont exigés dans le resolver.
export const studentTypeDefs = gql`
  type Student {
    id: ID!
    name: String!
    prenom: String!
    email: String!
    niveauEtude: String!
    dateNaissance: String!
    ville: String!
    numeroWhatsapp: String!
    dateInscription: String
  }

  extend type Query {
    students: [Student!]!
    student(id: ID!): Student
  }

  extend type Mutation {
    createStudent(
      name: String!
      prenom: String!
      email: String!
      niveauEtude: String
      dateNaissance: String
      ville: String
      numeroWhatsapp: String
    ): Student!

    deleteStudent(id: ID!): Boolean!
  }
`;
