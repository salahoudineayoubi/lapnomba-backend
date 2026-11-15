import EventOrganizerApplication, {
  EVENT_SKILLS,
  EVENT_TYPES,
} from "../../../models/eventOrganizerApplication";
import { GraphQLContext } from "../../../utils/auth";
import {
  ValidationError,
  validateEmail,
  validatePhone,
  validateRequiredText,
  trimOptional,
} from "../candidature/mutation/candidature.validation";
import { limitPublicForm, sendAcknowledgement, toPublicFormError } from "../publicForm.helpers";

const uniqueAllowed = <T extends string>(values: any, allowed: readonly T[]): T[] =>
  Array.from(new Set((Array.isArray(values) ? values : []).filter((v: any) => allowed.includes(v)))) as T[];

export const eventOrganizerResolvers = {
  Query: {
    // Admin uniquement (voir accessControl.ts)
    eventOrganizerApplications: async () => EventOrganizerApplication.find().sort({ createdAt: -1 }),
  },

  Mutation: {
    createEventOrganizerApplication: async (_: any, { input }: any, context: GraphQLContext) => {
      try {
        limitPublicForm("createEventOrganizerApplication", context);

        const eventTypes = uniqueAllowed(input.eventTypes, EVENT_TYPES);
        if (!eventTypes.length) throw new ValidationError("Choisissez au moins un type d'événement.");

        const pastEvents = trimOptional(input.pastEvents);
        if (pastEvents && pastEvents.length > 2000) {
          throw new ValidationError("La description de vos expériences ne doit pas dépasser 2000 caractères.");
        }

        const saved = await EventOrganizerApplication.create({
          fullName: validateRequiredText(input.fullName, "Le nom complet", { min: 2, max: 120 }),
          email: validateEmail(input.email),
          phone: validatePhone(input.phone, "Le numéro WhatsApp"),
          country: validateRequiredText(input.country, "Le pays", { min: 2, max: 60 }),
          city: validateRequiredText(input.city, "La ville", { min: 2, max: 80 }),
          eventTypes,
          skills: uniqueAllowed(input.skills, EVENT_SKILLS),
          experience: input.experience,
          availability: input.availability,
          pastEvents,
          motivation: validateRequiredText(input.motivation, "La motivation", { min: 20, max: 3000 }),
          status: "PENDING",
        });

        sendAcknowledgement(saved.email, saved.fullName, "Candidature Organisateur d'événements - Lap Nomba Foundation", [
          "Merci pour votre candidature au rôle d'Organisateur d'événements & d'activités de la Lap Nomba Foundation.",
          "Notre équipe étudie votre profil et vous contactera par e-mail ou WhatsApp pour la suite, notamment pour vous associer à nos prochaines actions sur les campus, dans les écoles et dans les quartiers.",
        ]);

        return saved;
      } catch (error: any) {
        throw toPublicFormError(
          error,
          "Une candidature existe déjà avec cet e-mail.",
          "Impossible d'enregistrer votre candidature."
        );
      }
    },

    // Admin uniquement (voir accessControl.ts)
    updateEventOrganizerApplicationStatus: async (_: any, { id, status }: { id: string; status: string }) => {
      const updated = await EventOrganizerApplication.findByIdAndUpdate(id, { status }, { new: true });
      if (!updated) throw new Error("Candidature introuvable.");
      return updated;
    },

    // Admin uniquement (voir accessControl.ts)
    deleteEventOrganizerApplication: async (_: any, { id }: { id: string }) =>
      !!(await EventOrganizerApplication.findByIdAndDelete(id)),
  },

  EventOrganizerApplication: {
    createdAt: (m: any) => (m.createdAt ? new Date(m.createdAt).toISOString() : null),
  },
};
