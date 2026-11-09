import { UserInputError } from "apollo-server-express";
import { TestimonialModel, LocalizedText } from "../../../models/testimonial";
import { uploadFromBase64 } from "../../../utils/cloudinary";
import { validateUploadedFile, FileValidationError } from "../../../utils/fileValidation";
import { hasAllLanguages, mergeTranslations, runTranslationInBackground, translateShortTexts } from "../../../services/textTranslation";

const LANGS = ["fr", "en", "tr", "ar"] as const;
const AVATAR_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Garde uniquement les traductions non vides (fr | en | tr | ar). */
export const cleanLocalized = (value: any): LocalizedText | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const out: LocalizedText = {};
  for (const lang of LANGS) {
    const text = typeof value[lang] === "string" ? value[lang].trim() : "";
    if (text) out[lang] = text;
  }
  return Object.keys(out).length ? out : undefined;
};

const optionalText = (value: any, label: string, max: number): string | undefined => {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > max) throw new UserInputError(`${label} ne doit pas dépasser ${max} caractères.`);
  return text || undefined;
};

const requiredText = (value: any, label: string, max: number): string => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new UserInputError(`${label} est requis.`);
  if (text.length > max) throw new UserInputError(`${label} ne doit pas dépasser ${max} caractères.`);
  return text;
};

/** Data URI → upload Cloudinary ; URL https existante → conservée telle quelle. */
const processAvatar = async (avatar: any): Promise<string> => {
  const value = typeof avatar === "string" ? avatar.trim() : "";
  if (value.startsWith("https://")) return value;
  if (!value.startsWith("data:")) throw new UserInputError("La photo du témoignage est requise.");
  try {
    validateUploadedFile(value, { allowedMimes: AVATAR_MIMES, maxBytes: MAX_AVATAR_BYTES, label: "Photo" });
  } catch (error: any) {
    if (error instanceof FileValidationError) throw new UserInputError(error.message);
    throw error;
  }
  const uploaded = await uploadFromBase64(value, { folder: "testimonials", resource_type: "image" });
  return uploaded.secure_url;
};

/**
 * Traduction IA du témoignage et du poste dans les 4 langues.
 * `overwrite` : le texte d'origine a changé → les traductions générées
 * précédemment sont remplacées ; sinon seules les langues vides sont remplies.
 */
export const translateTestimonial = async (
  id: string,
  client: Parameters<typeof translateShortTexts>[0],
  overwrite: { temoignage?: boolean; poste?: boolean } = {}
) => {
  const t = await TestimonialModel.findById(id);
  if (!t?.temoignage) return;
  const fields: Record<string, string> = {};
  if (overwrite.temoignage || !hasAllLanguages(t.temoignageI18n)) fields.temoignage = t.temoignage;
  if (t.poste && (overwrite.poste || !hasAllLanguages(t.posteI18n))) fields.poste = t.poste;
  if (!Object.keys(fields).length) return;
  const result = await translateShortTexts(client, "first-person testimonial from a former learner", fields);
  if (fields.temoignage) t.temoignageI18n = mergeTranslations(t.temoignageI18n, result.i18n.temoignage, overwrite.temoignage);
  if (fields.poste) t.posteI18n = mergeTranslations(t.posteI18n, result.i18n.poste, overwrite.poste);
  await t.save();
};

export const testimonialResolvers = {
  Query: {
    testimonials: async () => TestimonialModel.find().sort({ createdAt: -1 }).lean(),
    testimonial: async (_: any, { id }: { id: string }) => TestimonialModel.findById(id).lean(),
  },
  Mutation: {
    // Admin uniquement (voir accessControl.ts)
    createTestimonial: async (_: any, { nomComplet, poste, posteI18n, avatar, temoignage, temoignageI18n }: any) => {
      const testimonial = new TestimonialModel({
        nomComplet: requiredText(nomComplet, "Le nom complet", 120),
        poste: optionalText(poste, "Le poste", 120),
        posteI18n: cleanLocalized(posteI18n),
        temoignage: requiredText(temoignage, "Le témoignage", 1500),
        temoignageI18n: cleanLocalized(temoignageI18n),
        avatar: await processAvatar(avatar),
      });
      const saved = (await testimonial.save()).toObject();
      // Langues laissées vides dans l'admin : complétées par l'IA en arrière-plan.
      runTranslationInBackground(`témoignage ${saved._id}`, (client) => translateTestimonial(String(saved._id), client));
      return saved;
    },

    updateTestimonial: async (_: any, { id, ...fields }: any) => {
      // Les champs vides envoyés par le formulaire admin n'écrasent rien.
      const update: Record<string, unknown> = {};
      if (typeof fields.nomComplet === "string" && fields.nomComplet.trim()) {
        update.nomComplet = requiredText(fields.nomComplet, "Le nom complet", 120);
      }
      if (typeof fields.temoignage === "string" && fields.temoignage.trim()) {
        update.temoignage = requiredText(fields.temoignage, "Le témoignage", 1500);
      }
      // Poste : une chaîne vide efface la valeur.
      if (fields.poste !== undefined && fields.poste !== null) update.poste = optionalText(fields.poste, "Le poste", 120) ?? "";
      if (typeof fields.avatar === "string" && fields.avatar.trim()) update.avatar = await processAvatar(fields.avatar);
      if (fields.posteI18n !== undefined) update.posteI18n = cleanLocalized(fields.posteI18n);
      if (fields.temoignageI18n !== undefined) update.temoignageI18n = cleanLocalized(fields.temoignageI18n);
      const before = await TestimonialModel.findById(id).lean();
      const testimonial = await TestimonialModel.findByIdAndUpdate(id, update, { new: true });
      if (!testimonial) throw new Error("Témoignage non trouvé");
      // Texte d'origine modifié sans traductions fournies → l'IA les régénère.
      const overwrite = {
        temoignage: !!update.temoignage && update.temoignage !== before?.temoignage && fields.temoignageI18n == null,
        poste: !!update.poste && update.poste !== before?.poste && fields.posteI18n == null,
      };
      runTranslationInBackground(`témoignage ${id}`, (client) => translateTestimonial(id, client, overwrite));
      return testimonial.toObject();
    },

    deleteTestimonial: async (_: any, { id }: { id: string }) => {
      const result = await TestimonialModel.deleteOne({ _id: id });
      return result.deletedCount !== 0;
    },
  },
};
