import { UserInputError } from "apollo-server-express";
import { TALENT_AVAILABILITIES, TalentProfileModel } from "../../../models/talent_profile";
import { TALENT_ENGAGEMENTS, TALENT_ROLES, TALENT_SENIORITIES } from "../../../models/talent_request";
import { LocalizedText } from "../../../models/testimonial";
import { uploadFromBase64 } from "../../../utils/cloudinary";
import { validateUploadedFile, FileValidationError } from "../../../utils/fileValidation";
import { GraphQLContext } from "../../../utils/auth";
import {
  hasAllLanguages,
  mergeTranslations,
  runTranslationInBackground,
  translateShortTexts,
} from "../../../services/textTranslation";
import { cleanLocalized } from "../testimonials/resolvers";

const PHOTO_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

const oneOf = <T extends readonly string[]>(value: unknown, allowed: T): T[number] | undefined =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T[number]) : undefined;

const text = (value: unknown, max: number, label: string): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const v = String(value).trim();
  if (v.length > max) throw new UserInputError(`${label} : ${max} caractères maximum.`);
  return v;
};

const url = (value: unknown, label: string): string | undefined => {
  const v = text(value, 300, label);
  if (v === undefined || v === "") return v;
  if (!/^https:\/\//i.test(v)) throw new UserInputError(`${label} : l'adresse doit commencer par https://`);
  return v;
};

const list = (value: unknown, maxItems: number, maxLen: number): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return Array.from(new Set(value.map((s) => String(s).trim()).filter(Boolean).map((s) => s.slice(0, maxLen)))).slice(0, maxItems);
};

export const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "talent";

const uniqueSlug = async (base: string, excludeId?: string) => {
  let slug = slugify(base);
  for (let i = 2; await TalentProfileModel.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i++) {
    slug = `${slugify(base)}-${i}`;
  }
  return slug;
};

const processPhoto = async (value: unknown): Promise<string | undefined> => {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return undefined;
  if (/^https:\/\//i.test(v)) return v;
  if (!v.startsWith("data:")) throw new UserInputError("Photo invalide.");
  try {
    validateUploadedFile(v, { allowedMimes: PHOTO_MIMES, maxBytes: MAX_PHOTO_BYTES, label: "Photo" });
  } catch (error: any) {
    if (error instanceof FileValidationError) throw new UserInputError(error.message);
    throw error;
  }
  const uploaded = await uploadFromBase64(v, { folder: "talents", resource_type: "image" });
  return uploaded.secure_url;
};

/** Champs du formulaire admin → document (seuls les champs fournis sont modifiés). */
const buildFields = async (input: any) => {
  const f: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined) f[k] = v;
  };
  set("displayName", text(input.displayName, 80, "Nom affiché"));
  set("fullName", text(input.fullName, 150, "Nom complet"));
  set("email", text(input.email, 200, "Email")?.toLowerCase());
  set("phone", text(input.phone, 40, "Téléphone"));
  set("headline", text(input.headline, 120, "Titre"));
  set("bio", text(input.bio, 1500, "Présentation"));
  if (input.headlineI18n !== undefined) f.headlineI18n = cleanLocalized(input.headlineI18n) ?? {};
  if (input.bioI18n !== undefined) f.bioI18n = cleanLocalized(input.bioI18n) ?? {};
  if (input.expertise !== undefined) {
    const e = oneOf(input.expertise, TALENT_ROLES);
    if (!e) throw new UserInputError("Domaine d'expertise invalide.");
    f.expertise = e;
  }
  set("skills", list(input.skills, 20, 40));
  if (input.seniority !== undefined) f.seniority = oneOf(input.seniority, TALENT_SENIORITIES) ?? null;
  if (input.yearsExperience !== undefined && input.yearsExperience !== null) {
    const y = Number(input.yearsExperience);
    if (!Number.isInteger(y) || y < 0 || y > 50) throw new UserInputError("Années d'expérience invalides.");
    f.yearsExperience = y;
  }
  set("city", text(input.city, 80, "Ville"));
  set("country", text(input.country, 80, "Pays"));
  if (input.availability !== undefined) f.availability = oneOf(input.availability, TALENT_AVAILABILITIES) ?? "available";
  if (Array.isArray(input.engagements)) f.engagements = input.engagements.filter((e: unknown) => oneOf(e, TALENT_ENGAGEMENTS));
  set("spokenLanguages", list(input.spokenLanguages, 8, 30));
  set("trainingProgram", text(input.trainingProgram, 120, "Formation suivie"));
  if (input.vetting) {
    for (const k of ["training", "projects", "technicalAssessment", "softSkills"]) {
      if (typeof input.vetting[k] === "boolean") f[`vetting.${k}`] = input.vetting[k];
    }
  }
  set("portfolioUrl", url(input.portfolioUrl, "Portfolio"));
  set("githubUrl", url(input.githubUrl, "GitHub"));
  set("linkedinUrl", url(input.linkedinUrl, "LinkedIn"));
  set("notes", text(input.notes, 3000, "Notes internes"));
  for (const k of ["consentObtained", "published", "featured"]) if (typeof input[k] === "boolean") f[k] = input[k];
  if (Number.isInteger(input.order)) f.order = input.order;
  const photo = await processPhoto(input.photo);
  if (photo) f.photo = photo;
  return f;
};

/** Titre et présentation traduits par l'IA (langues vides, ou toutes si le texte a changé). */
const translateProfile = async (id: string, client: Parameters<typeof translateShortTexts>[0], overwrite: { headline?: boolean; bio?: boolean } = {}) => {
  const p = await TalentProfileModel.findById(id);
  if (!p) return;
  const fields: Record<string, string> = {};
  if (p.headline && (overwrite.headline || !hasAllLanguages(p.headlineI18n))) fields.headline = p.headline;
  if (p.bio && (overwrite.bio || !hasAllLanguages(p.bioI18n))) fields.bio = p.bio;
  if (!Object.keys(fields).length) return;
  const result = await translateShortTexts(client, "professional profile of a tech talent (job title and short bio)", fields);
  if (fields.headline) p.headlineI18n = mergeTranslations(p.headlineI18n as LocalizedText, result.i18n.headline, overwrite.headline);
  if (fields.bio) p.bioI18n = mergeTranslations(p.bioI18n as LocalizedText, result.i18n.bio, overwrite.bio);
  await p.save();
};

const PUBLIC_FILTER = { published: true, consentObtained: true };

export const talentProfileResolvers = {
  Query: {
    talentProfiles: async (_: any, args: { expertise?: string; seniority?: string; availability?: string; featured?: boolean; limit?: number }) => {
      const q: Record<string, unknown> = { ...PUBLIC_FILTER };
      if (oneOf(args.expertise, TALENT_ROLES)) q.expertise = args.expertise;
      if (oneOf(args.seniority, TALENT_SENIORITIES)) q.seniority = args.seniority;
      if (oneOf(args.availability, TALENT_AVAILABILITIES)) q.availability = args.availability;
      if (args.featured) q.featured = true;
      const limit = Math.min(Math.max(args.limit || 60, 1), 200);
      return TalentProfileModel.find(q).sort({ featured: -1, order: 1, createdAt: -1 }).limit(limit);
    },
    talentProfile: async (_: any, { slug }: { slug: string }) =>
      TalentProfileModel.findOne({ slug: String(slug || "").trim().toLowerCase(), ...PUBLIC_FILTER }),
    // Admin uniquement (voir accessControl.ts)
    adminTalentProfiles: async () => TalentProfileModel.find().sort({ order: 1, createdAt: -1 }),
  },

  Mutation: {
    createTalentProfile: async (_: any, { input }: { input: any }) => {
      const f = await buildFields(input || {});
      if (!f.displayName) throw new UserInputError("Le nom affiché est requis (ex. « Moussa K. »).");
      if (!f.headline) throw new UserInputError("Le titre est requis (ex. « Développeur React & Node.js »).");
      if (!f.expertise) throw new UserInputError("Le domaine d'expertise est requis.");
      if (f.published && !f.consentObtained) throw new UserInputError("Publication impossible sans le consentement de la personne.");
      const profile = await TalentProfileModel.create({ ...f, slug: await uniqueSlug(String(f.displayName)) });
      runTranslationInBackground(`profil talent ${profile._id}`, (c) => translateProfile(String(profile._id), c));
      return profile;
    },

    updateTalentProfile: async (_: any, { id, input }: { id: string; input: any }) => {
      const before = await TalentProfileModel.findById(id);
      if (!before) throw new Error("Profil introuvable.");
      const f = await buildFields(input || {});
      for (const k of ["displayName", "headline"]) if (k in f && !f[k]) throw new UserInputError("Ce champ ne peut pas être vide.");
      const consent = "consentObtained" in f ? f.consentObtained : before.consentObtained;
      const published = "published" in f ? f.published : before.published;
      if (published && !consent) throw new UserInputError("Publication impossible sans le consentement de la personne.");
      const profile = await TalentProfileModel.findByIdAndUpdate(id, { $set: f }, { new: true });
      const overwrite = {
        headline: typeof f.headline === "string" && f.headline !== before.headline && input.headlineI18n == null,
        bio: typeof f.bio === "string" && f.bio !== before.bio && input.bioI18n == null,
      };
      runTranslationInBackground(`profil talent ${id}`, (c) => translateProfile(id, c, overwrite));
      return profile;
    },

    deleteTalentProfile: async (_: any, { id }: { id: string }) => (await TalentProfileModel.deleteOne({ _id: id })).deletedCount !== 0,
  },

  TalentProfile: {
    id: (p: any) => String(p._id ?? p.id),
    vetting: (p: any) => ({
      training: !!p.vetting?.training,
      projects: !!p.vetting?.projects,
      technicalAssessment: !!p.vetting?.technicalAssessment,
      softSkills: !!p.vetting?.softSkills,
    }),
    skills: (p: any) => p.skills ?? [],
    engagements: (p: any) => p.engagements ?? [],
    spokenLanguages: (p: any) => p.spokenLanguages ?? [],
    published: (p: any) => !!p.published,
    featured: (p: any) => !!p.featured,
    order: (p: any) => p.order ?? 0,
    createdAt: (p: any) => new Date(p.createdAt).toISOString(),
    updatedAt: (p: any) => new Date(p.updatedAt).toISOString(),
  },
};

/** Coordonnées et liens personnels : réservés à l'équipe (contact via Lap Nomba). */
export const talentProfilePrivacy = (adminOr: (ctx: GraphQLContext, v: any, fallback: any) => any) => ({
  fullName: (p: any, _: any, ctx: GraphQLContext) => adminOr(ctx, p.fullName ?? null, null),
  email: (p: any, _: any, ctx: GraphQLContext) => adminOr(ctx, p.email ?? null, null),
  phone: (p: any, _: any, ctx: GraphQLContext) => adminOr(ctx, p.phone ?? null, null),
  notes: (p: any, _: any, ctx: GraphQLContext) => adminOr(ctx, p.notes ?? null, null),
  portfolioUrl: (p: any, _: any, ctx: GraphQLContext) => adminOr(ctx, p.portfolioUrl ?? null, null),
  githubUrl: (p: any, _: any, ctx: GraphQLContext) => adminOr(ctx, p.githubUrl ?? null, null),
  linkedinUrl: (p: any, _: any, ctx: GraphQLContext) => adminOr(ctx, p.linkedinUrl ?? null, null),
  consentObtained: (p: any, _: any, ctx: GraphQLContext) => adminOr(ctx, !!p.consentObtained, null),
});
