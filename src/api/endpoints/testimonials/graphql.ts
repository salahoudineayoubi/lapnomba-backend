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

  """
  Témoignage écrit avec photo (nomComplet, avatar, temoignage), géré depuis
  l'admin. Les champs titre/description/video/poster appartiennent à l'ancien
  format vidéo et ne sont renseignés que pour les anciens enregistrements.
  """
  type Testimonial {
    id: ID!
    nomComplet: String
    poste: String
    posteI18n: LocalizedText
    avatar: String
    temoignage: String
    temoignageI18n: LocalizedText
    titre: String
    description: String
    video: String
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
    "avatar : data URI (image JPEG/PNG/WebP, 2 Mo max) envoyée sur Cloudinary, ou URL https existante."
    createTestimonial(
      nomComplet: String!
      poste: String
      posteI18n: LocalizedTextInput
      avatar: String!
      temoignage: String!
      temoignageI18n: LocalizedTextInput
    ): Testimonial!

    updateTestimonial(
      id: ID!
      nomComplet: String
      poste: String
      posteI18n: LocalizedTextInput
      avatar: String
      temoignage: String
      temoignageI18n: LocalizedTextInput
    ): Testimonial!

    deleteTestimonial(id: ID!): Boolean!
  }
`;
