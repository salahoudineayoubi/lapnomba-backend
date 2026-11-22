import { gql } from "apollo-server-express";

// LocalizedText / LocalizedTextInput sont déclarés dans testimonials/graphql.ts.
export const leaderTypeDefs = gql`
  "Membre de l'équipe dirigeante (page « Nos leaders »), géré depuis l'admin."
  type Leader {
    id: ID!
    "Identifiant d'URL : lapnomba.org/leaders/<slug>"
    slug: String!
    name: String!
    "Fonction (fr obligatoire ; le site affiche le français si une langue est vide)."
    title: LocalizedText!
    "Présentation (paragraphes séparés par des retours à la ligne)."
    bio: LocalizedText!
    "URL publique Cloudinary de la photo."
    avatar: String
    order: Int!
    isActive: Boolean!
    createdAt: String
    updatedAt: String
  }

  input LeaderInput {
    name: String
    "Facultatif à la création (généré à partir du nom) ; minuscules, chiffres et tirets."
    slug: String
    title: LocalizedTextInput
    bio: LocalizedTextInput
    "data URI (image JPEG/PNG/WebP, 3 Mo max) téléversée sur Cloudinary, ou URL https existante."
    avatar: String
    order: Int
    isActive: Boolean
  }

  extend type Query {
    "Leaders visibles sur le site, triés par ordre."
    leaders: [Leader!]!
    "Un leader visible, par slug."
    leader(slug: String!): Leader
    "ADMIN : tous les leaders, visibles ou masqués."
    adminLeaders: [Leader!]!
  }

  extend type Mutation {
    "ADMIN"
    createLeader(input: LeaderInput!): Leader!
    "ADMIN : seuls les champs fournis sont modifiés."
    updateLeader(id: ID!, input: LeaderInput!): Leader!
    "ADMIN : supprime aussi la photo sur Cloudinary."
    deleteLeader(id: ID!): Boolean!
    "ADMIN : ids dans le nouvel ordre d'affichage (order = position)."
    reorderLeaders(ids: [ID!]!): [Leader!]!
  }
`;
