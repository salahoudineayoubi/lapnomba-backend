import {
  TALENT_ENGAGEMENTS,
  TALENT_REQUEST_STATUSES,
  TALENT_ROLES,
  TALENT_SENIORITIES,
  TalentRequestModel,
} from "../../../models/talent_request";
import { GraphQLContext } from "../../../utils/auth";
import { sendMail } from "../../../utils/sendMail";
import logger from "../../../utils/logger";
import { ValidationError, validateEmail, validateRequiredText } from "../candidature/mutation/candidature.validation";
import { limitPublicForm, sendAcknowledgement, toPublicFormError } from "../publicForm.helpers";

const optionalText = (value: unknown, max: number): string | undefined => {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return undefined;
  if (v.length > max) throw new ValidationError(`Un champ dépasse ${max} caractères.`, "FIELD_TOO_LONG");
  return v;
};

const oneOf = <T extends readonly string[]>(value: unknown, allowed: T): T[number] | undefined =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T[number]) : undefined;

const ACK: Record<string, { subject: string; paragraphs: string[] }> = {
  fr: {
    subject: "Votre demande de talents — Lap Nomba Engineering",
    paragraphs: [
      "Merci pour votre demande : elle a bien été reçue.",
      "Notre équipe étudie vos besoins et vous recontacte rapidement pour en parler et vous proposer des profils adaptés.",
      "Chaque collaboration contribue à financer la formation gratuite de jeunes au Cameroun.",
    ],
  },
  en: {
    subject: "Your talent request — Lap Nomba Engineering",
    paragraphs: [
      "Thank you for your request: we have received it.",
      "Our team is reviewing your needs and will get back to you shortly to discuss them and suggest suitable profiles.",
      "Every engagement helps fund free training for young people in Cameroon.",
    ],
  },
};

const notifyTeam = (r: any) => {
  const to = (process.env.ADMIN_EMAIL || "").trim() || "contact@lapnomba.org";
  const lines = [
    `Entreprise : ${r.companyName}`,
    `Contact : ${r.contactName} <${r.email}>${r.phone ? ` · ${r.phone}` : ""}`,
    `Pays : ${r.country || "—"}`,
    `Profils : ${(r.roles || []).join(", ") || "—"}`,
    `Niveau : ${r.seniority || "—"} · Taille d'équipe : ${r.teamSize ?? "—"} · Engagement : ${r.engagement || "—"}`,
    `Démarrage : ${r.startDate || "—"}`,
    "",
    r.message || "",
  ];
  const subject = `[Talents] Nouvelle demande — ${String(r.companyName).replace(/[\r\n]+/g, " ")}`;
  void sendMail({ to, subject, text: lines.join("\n"), replyTo: r.email }).catch((e: any) =>
    logger.error(`Notification de demande de talents non envoyée : ${e?.message ?? e}`)
  );
};

export const talentRequestResolvers = {
  Query: {
    // Admin uniquement (voir accessControl.ts)
    talentRequests: async () => TalentRequestModel.find().sort({ createdAt: -1 }).limit(500),
  },

  Mutation: {
    createTalentRequest: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      try {
        limitPublicForm("createTalentRequest", context);

        const roles = Array.isArray(input?.roles)
          ? Array.from(new Set(input.roles.filter((r: unknown) => oneOf(r, TALENT_ROLES))))
          : [];
        if (!roles.length) throw new ValidationError("Choisissez au moins un profil recherché.", "ROLES_REQUIRED");

        const teamSize =
          input?.teamSize === undefined || input?.teamSize === null ? undefined : Number(input.teamSize);
        if (teamSize !== undefined && (!Number.isInteger(teamSize) || teamSize < 1 || teamSize > 500)) {
          throw new ValidationError("Taille d'équipe invalide.", "INVALID_TEAM_SIZE");
        }

        const language = oneOf(input?.language, ["fr", "en", "tr", "ar"] as const);
        const request = await TalentRequestModel.create({
          companyName: validateRequiredText(input?.companyName, "Le nom de l'entreprise", { min: 1, max: 150 }),
          contactName: validateRequiredText(input?.contactName, "Le nom du contact", { min: 1, max: 150 }),
          email: validateEmail(input?.email),
          phone: optionalText(input?.phone, 40),
          country: optionalText(input?.country, 100),
          roles,
          seniority: oneOf(input?.seniority, TALENT_SENIORITIES),
          teamSize,
          engagement: oneOf(input?.engagement, TALENT_ENGAGEMENTS),
          startDate: optionalText(input?.startDate, 60),
          message: optionalText(input?.message, 3000),
          language,
        });

        const ack = ACK[language === "fr" ? "fr" : language ? "en" : "fr"];
        sendAcknowledgement(request.email, request.contactName, ack.subject, ack.paragraphs);
        notifyTeam(request);

        return { success: true, message: "Demande enregistrée.", id: String(request._id) };
      } catch (error: any) {
        throw toPublicFormError(error, "Cette demande existe déjà.", "Impossible d'enregistrer la demande.");
      }
    },

    // Admin uniquement (voir accessControl.ts)
    updateTalentRequestStatus: async (_: any, { id, status }: { id: string; status: string }) => {
      if (!oneOf(status, TALENT_REQUEST_STATUSES)) throw new Error("Statut invalide.");
      const request = await TalentRequestModel.findByIdAndUpdate(id, { status }, { new: true });
      if (!request) throw new Error("Demande introuvable.");
      return request;
    },

    deleteTalentRequest: async (_: any, { id }: { id: string }) => {
      const result = await TalentRequestModel.deleteOne({ _id: id });
      return result.deletedCount !== 0;
    },
  },

  TalentRequest: {
    id: (r: any) => String(r._id ?? r.id),
    createdAt: (r: any) => new Date(r.createdAt).toISOString(),
  },
};
