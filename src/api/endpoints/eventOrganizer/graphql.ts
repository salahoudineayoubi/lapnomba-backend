import { gql } from "apollo-server-express";

export const eventOrganizerTypeDefs = gql`
  enum EventOrganizerEventType {
    CAMPUS
    SCHOOL
    COMMUNITY
    HACKATHON
    CONFERENCE
    ONLINE
  }

  enum EventOrganizerSkill {
    LOGISTICS
    COMMUNICATION
    MOBILISATION
    PHOTO_VIDEO
    HOSTING
    PARTNERSHIPS
  }

  enum EventOrganizerExperience {
    NONE
    SOME
    EXPERIENCED
  }

  enum EventOrganizerAvailability {
    WEEKENDS
    EVENINGS
    FLEXIBLE
  }

  enum EventOrganizerStatus {
    PENDING
    ACCEPTED
    REJECTED
  }

  type EventOrganizerApplication {
    id: ID!
    fullName: String!
    email: String!
    phone: String!
    country: String!
    city: String!
    eventTypes: [EventOrganizerEventType!]!
    skills: [EventOrganizerSkill!]!
    experience: EventOrganizerExperience!
    availability: EventOrganizerAvailability!
    pastEvents: String
    motivation: String!
    status: EventOrganizerStatus!
    createdAt: String!
  }

  input CreateEventOrganizerApplicationInput {
    fullName: String!
    email: String!
    phone: String!
    country: String!
    city: String!
    eventTypes: [EventOrganizerEventType!]!
    skills: [EventOrganizerSkill!]
    experience: EventOrganizerExperience!
    availability: EventOrganizerAvailability!
    pastEvents: String
    motivation: String!
  }

  extend type Query {
    "Admin uniquement"
    eventOrganizerApplications: [EventOrganizerApplication!]!
  }

  extend type Mutation {
    "Public : candidature depuis volunteer.lapnomba.org/events/join"
    createEventOrganizerApplication(input: CreateEventOrganizerApplicationInput!): EventOrganizerApplication!
    "Admin uniquement"
    updateEventOrganizerApplicationStatus(id: ID!, status: EventOrganizerStatus!): EventOrganizerApplication!
    "Admin uniquement"
    deleteEventOrganizerApplication(id: ID!): Boolean!
  }
`;
