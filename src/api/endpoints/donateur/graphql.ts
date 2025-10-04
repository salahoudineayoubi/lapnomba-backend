import { gql } from "apollo-server-express";
export const donateurTypeDefs = gql`
  type Donateur {
    id: ID!
    nom: String!
    email: String!
    montant: Float!
    typePaiement: String!
    numeroMobileMoney: String
    bankName: String
    bankAccount: String
    bankSwift: String
    commentaire: String
    futureContact: Boolean
    date: String
  }

  type DonateurStats {
    totalMontant: Float!
    nombreDonateurs: Int!
  }

  type Query {
    donateurs: [Donateur!]!
    donateur(id: ID!): Donateur
    donateurStats: DonateurStats!
  }

  type Mutation {
    createDonateur(
      nom: String!
      email: String!
      montant: Float!
      typePaiement: String!
      numeroMobileMoney: String
      bankName: String
      bankAccount: String
      bankSwift: String
      commentaire: String
      futureContact: Boolean
    ): Donateur!

    updateDonateur(
      id: ID!
      nom: String
      email: String
      montant: Float
      typePaiement: String
      numeroMobileMoney: String
      bankName: String
      bankAccount: String
      bankSwift: String
      commentaire: String
      futureContact: Boolean
    ): Donateur!

    deleteDonateur(id: ID!): Boolean!
  }
`;