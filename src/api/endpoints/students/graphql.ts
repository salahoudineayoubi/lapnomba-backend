import { gql } from "apollo-server-express";

export const studentTypeDefs = gql`
  type Student {
    id: ID!
    name: String!
    prenom: String!
    email: String!
    niveauEtude: String
    dateNaissance: String
    ville: String
    numeroWhatsapp: String
    dateInscription: String
  }

  type Query {
    students: [Student!]!
    student(id: ID!): Student
  }

  type Mutation {
    createStudent(
      name: String!
      prenom: String!
      email: String!
      niveauEtude: String
      dateNaissance: String
      ville: String
      numeroWhatsapp: String
    ): Student!

    updateStudent(
      id: ID!
      name: String
      prenom: String
      email: String
      niveauEtude: String
      dateNaissance: String
      ville: String
      numeroWhatsapp: String
    ): Student!

    deleteStudent(id: ID!): Boolean!
  }
`;