import MentorApplication from "../../../models/mentorApplication";
import { GraphQLContext } from "../../../utils/auth";
import { checkRateLimit } from "../../../utils/rateLimiter";
import {
  validateEmail,
  validatePhone,
  validateRequiredText,
  trimOptional,
} from "../candidature/mutation/candidature.validation";

const CREATE_MENTOR_RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

const ensureInt = (value: any, label: string, min: number, max: number): number => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`${label} doit être un nombre entier entre ${min} et ${max}.`);
  }
  return n;
};

const ensureUrl = (value?: string | null): string | undefined => {
  const url = trimOptional(value);
  if (!url) return undefined;
  if (!/^https?:\/\/\S+\.\S+/.test(url)) throw new Error("Le lien LinkedIn doit être une URL valide (https://…).");
  return url;
};

export const mentorResolvers = {
  Query: {
    // Admin uniquement (voir accessControl.ts)
    mentorApplications: async () => MentorApplication.find().sort({ createdAt: -1 }),
  },

  Mutation: {
    createMentorApplication: async (_: any, { input }: any, context: GraphQLContext) => {
      if (context?.ip) checkRateLimit(`createMentorApplication:${context.ip}`, CREATE_MENTOR_RATE_LIMIT);

      const data = {
        fullName: validateRequiredText(input.fullName, "Le nom complet", { min: 2, max: 120 }),
        email: validateEmail(input.email),
        phone: validatePhone(input.phone, "Le numéro de téléphone"),
        domain: input.domain,
        yearsExperience: ensureInt(input.yearsExperience, "Les années d'expérience", 0, 60),
        linkedinUrl: ensureUrl(input.linkedinUrl),
        motivation: validateRequiredText(input.motivation, "La motivation", { min: 20, max: 3000 }),
        hoursPerMonth: ensureInt(input.hoursPerMonth, "La disponibilité mensuelle", 1, 200),
        status: "PENDING" as const,
      };

      try {
        return await MentorApplication.create(data);
      } catch (error: any) {
        if (error?.code === 11000) throw new Error("Une candidature mentor existe déjà avec cet e-mail.");
        throw new Error("Impossible d'enregistrer la candidature mentor.");
      }
    },

    // Admin uniquement (voir accessControl.ts)
    updateMentorApplicationStatus: async (_: any, { id, status }: { id: string; status: string }) => {
      const updated = await MentorApplication.findByIdAndUpdate(id, { status }, { new: true });
      if (!updated) throw new Error("Candidature mentor introuvable.");
      return updated;
    },
  },

  MentorApplication: {
    createdAt: (m: any) => (m.createdAt ? new Date(m.createdAt).toISOString() : null),
  },
};
