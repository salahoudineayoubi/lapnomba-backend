import { gql } from "apollo-server-express";

export const eventTypeDefs = gql`
  type Event {
    id: ID!
    titre: String!
    description: String!
    contenu: String
    lieu: String
    categorie: String
    dateEvenement: String!
    images: [String!]!
    statut: String!
    createdAt: String
    updatedAt: String
  }

  input EventInput {
    titre: String!
    description: String!
    contenu: String
    lieu: String
    categorie: String
    dateEvenement: String!
    images: [String!]
    statut: String
  }

  input UpdateEventInput {
    id: ID!
    titre: String
    description: String
    contenu: String
    lieu: String
    categorie: String
    dateEvenement: String
    images: [String!]
    statut: String
  }

  extend type Query {
    # Public — uniquement les événements publiés, triés par date.
    publicEvents: [Event!]!

    # Admin only — tous les événements (brouillons inclus).
    events: [Event!]!
    event(id: ID!): Event
  }

  extend type Mutation {
    # Admin only.
    createEvent(input: EventInput!): Event!
    updateEvent(input: UpdateEventInput!): Event!
    deleteEvent(id: ID!): Boolean!
  }
`;
