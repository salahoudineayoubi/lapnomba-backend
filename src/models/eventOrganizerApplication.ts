import mongoose, { Document, Schema } from "mongoose";
import { transformPlugin } from "./plugins/transform.plugin";

export const EVENT_TYPES = ["CAMPUS", "SCHOOL", "COMMUNITY", "HACKATHON", "CONFERENCE", "ONLINE"] as const;
export const EVENT_SKILLS = ["LOGISTICS", "COMMUNICATION", "MOBILISATION", "PHOTO_VIDEO", "HOSTING", "PARTNERSHIPS"] as const;
export const EVENT_EXPERIENCE = ["NONE", "SOME", "EXPERIENCED"] as const;
export const EVENT_AVAILABILITY = ["WEEKENDS", "EVENINGS", "FLEXIBLE"] as const;
export const EVENT_ORGANIZER_STATUSES = ["PENDING", "ACCEPTED", "REJECTED"] as const;

export interface IEventOrganizerApplication extends Document {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  eventTypes: (typeof EVENT_TYPES)[number][];
  skills: (typeof EVENT_SKILLS)[number][];
  experience: (typeof EVENT_EXPERIENCE)[number];
  availability: (typeof EVENT_AVAILABILITY)[number];
  pastEvents?: string;
  motivation: string;
  status: (typeof EVENT_ORGANIZER_STATUSES)[number];
  createdAt: Date;
  updatedAt: Date;
}

/** Candidature d'un bénévole « Organisateur d'événements & d'activités » (axe « Sensibiliser »). */
const EventOrganizerApplicationSchema = new Schema<IEventOrganizerApplication>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    eventTypes: { type: [{ type: String, enum: EVENT_TYPES }], required: true },
    skills: { type: [{ type: String, enum: EVENT_SKILLS }], default: [] },
    experience: { type: String, required: true, enum: EVENT_EXPERIENCE },
    availability: { type: String, required: true, enum: EVENT_AVAILABILITY },
    pastEvents: { type: String, trim: true },
    motivation: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: EVENT_ORGANIZER_STATUSES, default: "PENDING", index: true },
  },
  { timestamps: true }
);

EventOrganizerApplicationSchema.plugin(transformPlugin);

export default (mongoose.models.EventOrganizerApplication as mongoose.Model<IEventOrganizerApplication>) ||
  mongoose.model<IEventOrganizerApplication>("EventOrganizerApplication", EventOrganizerApplicationSchema);
