import { gql } from "apollo-server-express";

export const testimonialTypeDefs = gql`
  "Texte traduit (chaque langue est facultative ; le site retombe sur l'original)."
  type LocalizedText {
    fr: String
    en: String
    tr: String
    ar: String
  }

  input LocalizedTextInput {
    fr: String
    en: String
    tr: String
    ar: String
  }

  type Testimonial {
    id: ID!
    titre: String!
    description: String!
    video: String!   # URL ou identifiant de la vidéo
    poster: String
    titreI18n: LocalizedText
    descriptionI18n: LocalizedText
    createdAt: String
    updatedAt: String
  }

  type Query {
    testimonials: [Testimonial!]!
    testimonial(id: ID!): Testimonial
  }

  type Mutation {
    createTestimonial(
      titre: String!
      description: String!
      video: String!
      poster: String
      titreI18n: LocalizedTextInput
      descriptionI18n: LocalizedTextInput
    ): Testimonial!

    updateTestimonial(
      id: ID!
      titre: String
      description: String
      video: String
      poster: String
      titreI18n: LocalizedTextInput
      descriptionI18n: LocalizedTextInput
    ): Testimonial!

    deleteTestimonial(id: ID!): Boolean!
  }
`;