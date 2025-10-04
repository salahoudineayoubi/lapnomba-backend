import { gql } from "apollo-server-express";

export const testimonialTypeDefs = gql`
  type Testimonial {
    id: ID!
    titre: String!
    description: String!
    video: String!   # URL ou identifiant de la vidéo
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
    ): Testimonial!

    updateTestimonial(
      id: ID!
      titre: String
      description: String
      video: String
    ): Testimonial!

    deleteTestimonial(id: ID!): Boolean!
  }
`;