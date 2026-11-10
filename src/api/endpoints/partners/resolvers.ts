import Partner from "../../../models/partners";
import { GraphQLContext } from "../../../utils/auth";
import { sendMail } from "../../../utils/sendMail";
import logger from "../../../utils/logger";
import {
  ValidationError,
  validateEmail,
  validatePhone,
  validateRequiredText,
} from "../candidature/mutation/candidature.validation";
import { limitPublicForm, sendAcknowledgement, toPublicFormError } from "../publicForm.helpers";

/** URL facultative : vide, ou http(s) valide (« www.site.cm » est complété en https://). */
const optionalUrl = (value: unknown, label: string): string | undefined => {
  let v = typeof value === "string" ? value.trim() : "";
  if (!v) return undefined;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) throw new Error();
  } catch {
    throw new ValidationError(`${label} : adresse invalide.`, "INVALID_URL");
  }
  if (v.length > 300) throw new ValidationError(`${label} : 300 caractères maximum.`, "INVALID_URL");
  return v;
};

const notifyTeam = (p: any) => {
  const to = (process.env.ADMIN_EMAIL || "").trim() || "contact@lapnomba.org";
  const text = [
    `Organisation : ${p.nomOrganisation}`,
    `Fondateur : ${p.nomFondateur}`,
    `Candidat : ${p.posteCandidat} — ${p.emailCandidat} — ${p.numeroContact}`,
    `Email officiel : ${p.emailOfficiel}`,
    `Domaine : ${p.domaineAction}`,
    `Adresse : ${p.adresse}, ${p.ville}, ${p.pays}`,
    `Site : ${p.siteWeb || "—"} · LinkedIn : ${p.urlLinkedin || "—"}`,
    "",
    p.presentationOrganisation,
  ].join("\n");
  const subject = `[Partenariat] Nouvelle demande — ${String(p.nomOrganisation).replace(/[\r\n]+/g, " ")}`;
  void sendMail({ to, subject, text, replyTo: p.emailCandidat }).catch((e: any) =>
    logger.error(`Notification de partenariat non envoyée : ${e?.message ?? e}`)
  );
};

export const partnerResolvers = {
  Query: {
    // Admin uniquement (voir accessControl.ts)
    partners: async () => Partner.find().sort({ createdAt: -1 }),
    partner: async (_: any, { id }: { id: string }) => Partner.findById(id),
  },
  Mutation: {
    createPartner: async (_: any, { input }: any, context: GraphQLContext) => {
      try {
        limitPublicForm("createPartner", context);
        const partner = await Partner.create({
          nomOrganisation: validateRequiredText(input?.nomOrganisation, "Le nom de l'organisation", { max: 150 }),
          nomFondateur: validateRequiredText(input?.nomFondateur, "Le nom du fondateur", { max: 150 }),
          emailCandidat: validateEmail(input?.emailCandidat),
          emailOfficiel: validateEmail(input?.emailOfficiel),
          numeroContact: validatePhone(input?.numeroContact, "Le numéro de contact"),
          posteCandidat: validateRequiredText(input?.posteCandidat, "Le poste du candidat", { max: 120 }),
          presentationOrganisation: validateRequiredText(input?.presentationOrganisation, "La présentation de l'organisation", { min: 30, max: 3000 }),
          domaineAction: validateRequiredText(input?.domaineAction, "Le domaine d'action", { max: 200 }),
          adresse: validateRequiredText(input?.adresse, "L'adresse", { max: 200 }),
          ville: validateRequiredText(input?.ville, "La ville", { max: 100 }),
          pays: validateRequiredText(input?.pays, "Le pays", { max: 100 }),
          siteWeb: optionalUrl(input?.siteWeb, "Site web"),
          urlLinkedin: optionalUrl(input?.urlLinkedin, "LinkedIn"),
        });

        sendAcknowledgement(partner.emailCandidat, partner.nomFondateur, "Votre demande de partenariat — Lap Nomba Foundation", [
          `Merci pour la demande de partenariat de ${partner.nomOrganisation} : elle a bien été reçue.`,
          "Notre équipe l'étudie et vous recontactera par email sous 5 à 10 jours ouvrables.",
        ]);
        notifyTeam(partner);
        return partner;
      } catch (error: any) {
        throw toPublicFormError(error, "Cette demande existe déjà.", "Impossible d'enregistrer la demande de partenariat.");
      }
    },
    // Admin uniquement (voir accessControl.ts)
    deletePartner: async (_: any, { id }: { id: string }) => !!(await Partner.findByIdAndDelete(id)),
  },
};
