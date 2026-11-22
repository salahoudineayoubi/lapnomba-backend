import { UserInputError } from "apollo-server-express";
import { LocalizedText } from "../../../models/testimonial";

/**
 * Validation des fiches leaders (fonctions pures, sans base ni Cloudinary :
 * testées dans __tests__/leaders).
 */

export const LEADER_LANGS = ["fr", "en", "tr", "ar"] as const;
export const NAME_MAX = 120;
export const TITLE_MAX = 200;
export const BIO_MAX = 5000;
export const SLUG_MAX = 80;
export const ORDER_MAX = 10000;
export const REORDER_MAX = 200;
export const AVATAR_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** « Abdel Naser Pouamoun » → « abdel-naser-pouamoun » (accents retirés). */
export const slugify = (value: string): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");

/** Slug saisi dans l'admin : minuscules, chiffres et tirets uniquement. */
export const validateSlug = (value: unknown): string => {
  const slug = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!slug) throw new UserInputError("Le slug est requis.");
  if (slug.length > SLUG_MAX) throw new UserInputError(`Le slug ne doit pas dépasser ${SLUG_MAX} caractères.`);
  if (!SLUG_PATTERN.test(slug)) {
    throw new UserInputError("Slug invalide : lettres minuscules sans accent, chiffres et tirets uniquement (ex. « jean-dupont »).");
  }
  return slug;
};

export const validateName = (value: unknown): string => {
  const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!name) throw new UserInputError("Le nom est requis.");
  if (name.length > NAME_MAX) throw new UserInputError(`Le nom ne doit pas dépasser ${NAME_MAX} caractères.`);
  return name;
};

/**
 * Texte traduit : garde les langues non vides, refuse les textes trop longs.
 * `requireFr` : le français est obligatoire (titre).
 */
export const validateLocalized = (
  value: unknown,
  { label, max, requireFr = false }: { label: string; max: number; requireFr?: boolean }
): LocalizedText => {
  const src = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const out: LocalizedText = {};
  for (const lang of LEADER_LANGS) {
    const text = typeof src[lang] === "string" ? (src[lang] as string).trim() : "";
    if (text.length > max) {
      throw new UserInputError(`${label} (${lang}) ne doit pas dépasser ${max} caractères.`);
    }
    if (text) out[lang] = text;
  }
  if (requireFr && !out.fr) throw new UserInputError(`${label} en français est requis.`);
  return out;
};

export const validateOrder = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > ORDER_MAX) {
    throw new UserInputError(`L'ordre doit être un nombre entier entre 0 et ${ORDER_MAX}.`);
  }
  return n;
};

/** Liste d'identifiants pour reorderLeaders : non vide, sans doublon, ObjectId valides. */
export const validateReorderIds = (ids: unknown, isValidId: (id: string) => boolean): string[] => {
  if (!Array.isArray(ids) || ids.length === 0) throw new UserInputError("La liste des leaders est vide.");
  if (ids.length > REORDER_MAX) throw new UserInputError("Trop de leaders dans la liste.");
  const list = ids.map((id) => String(id));
  if (new Set(list).size !== list.length) throw new UserInputError("La liste contient des doublons.");
  if (list.some((id) => !isValidId(id))) throw new UserInputError("Identifiant de leader invalide.");
  return list;
};

/**
 * Premier slug libre : base, base-2, base-3…
 * `exists` indique si un slug est déjà pris (par une autre fiche).
 */
export const findFreeSlug = async (base: string, exists: (slug: string) => Promise<boolean>): Promise<string> => {
  const root = slugify(base) || "leader";
  if (!(await exists(root))) return root;
  for (let i = 2; i < 1000; i++) {
    const suffix = `-${i}`;
    const candidate = `${root.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, "")}${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new UserInputError("Impossible de générer un slug unique : saisissez-en un.");
};

