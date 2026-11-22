import mongoose from "mongoose";
import { UserInputError } from "apollo-server-express";
import { LeaderModel } from "../../../models/leader";
import { deleteImage, uploadFromBase64 } from "../../../utils/cloudinary";
import { FileValidationError, validateUploadedFile } from "../../../utils/fileValidation";
import {
  AVATAR_MIMES,
  BIO_MAX,
  MAX_AVATAR_BYTES,
  TITLE_MAX,
  findFreeSlug,
  validateLocalized,
  validateName,
  validateOrder,
  validateReorderIds,
  validateSlug,
} from "./validation";

/**
 * Leaders (page « Nos leaders » de lapnomba.org).
 * Requêtes publiques : leaders, leader(slug) — fiches visibles uniquement.
 * Tout le reste est réservé à l'admin (voir accessControl.ts).
 */

type Avatar = { avatar: string; avatarPublicId?: string };

const SORT = { order: 1, createdAt: 1 } as const;

const assertId = (id: unknown): string => {
  const value = String(id ?? "");
  if (!mongoose.isValidObjectId(value)) throw new UserInputError("Identifiant de leader invalide.");
  return value;
};

/** Slug déjà pris par une autre fiche ? */
const slugTaken = async (slug: string, excludeId?: string): Promise<boolean> =>
  Boolean(await LeaderModel.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }));

/** Data URI → contrôle du type réel et de la taille, puis upload Cloudinary ; URL https → conservée. */
export const processLeaderAvatar = async (value: unknown): Promise<Avatar> => {
  const v = typeof value === "string" ? value.trim() : "";
  if (/^https:\/\//i.test(v)) return { avatar: v };
  if (!v.startsWith("data:")) throw new UserInputError("La photo du leader est requise (JPEG, PNG ou WebP).");
  try {
    validateUploadedFile(v, { allowedMimes: AVATAR_MIMES, maxBytes: MAX_AVATAR_BYTES, label: "Photo" });
  } catch (error: any) {
    if (error instanceof FileValidationError) throw new UserInputError(error.message);
    throw error;
  }
  const uploaded = await uploadFromBase64(v, { folder: "leaders", resource_type: "image" });
  return { avatar: uploaded.secure_url, avatarPublicId: uploaded.public_id };
};

/** La suppression d'une image ne doit jamais faire échouer l'opération principale. */
const removeImageQuietly = async (publicId?: string | null) => {
  try {
    await deleteImage(publicId);
  } catch (error: any) {
    console.warn(`Leaders : image Cloudinary ${publicId} non supprimée :`, error?.message || error);
  }
};

const duplicateSlug = (error: any) => error?.code === 11000;

export const leaderResolvers = {
  Query: {
    leaders: async () => LeaderModel.find({ isActive: true }).sort(SORT).lean(),
    leader: async (_: any, { slug }: { slug: string }) =>
      LeaderModel.findOne({ slug: String(slug || "").trim().toLowerCase(), isActive: true }).lean(),
    // Admin uniquement (voir accessControl.ts)
    adminLeaders: async () => LeaderModel.find().sort(SORT).lean(),
  },

  Mutation: {
    createLeader: async (_: any, { input }: { input: any }) => {
      const data = input || {};
      const name = validateName(data.name);
      const title = validateLocalized(data.title, { label: "Le titre", max: TITLE_MAX, requireFr: true });
      const bio = validateLocalized(data.bio, { label: "La biographie", max: BIO_MAX });

      let slug: string;
      if (typeof data.slug === "string" && data.slug.trim()) {
        slug = validateSlug(data.slug);
        if (await slugTaken(slug)) throw new UserInputError(`Le slug « ${slug} » est déjà utilisé par un autre leader.`);
      } else {
        slug = await findFreeSlug(name, (s) => slugTaken(s));
      }

      let order: number;
      if (data.order !== undefined && data.order !== null) {
        order = validateOrder(data.order);
      } else {
        // Nouveau leader : à la fin de la liste.
        const last: any = await LeaderModel.findOne().sort({ order: -1 }).select("order").lean();
        order = typeof last?.order === "number" ? last.order + 1 : 0;
      }

      const isActive = typeof data.isActive === "boolean" ? data.isActive : true;
      const avatar = await processLeaderAvatar(data.avatar);

      try {
        const created = await LeaderModel.create({ name, slug, title, bio, ...avatar, order, isActive });
        return typeof (created as any).toObject === "function" ? (created as any).toObject() : created;
      } catch (error) {
        // Fiche non créée : on ne garde pas l'image orpheline.
        await removeImageQuietly(avatar.avatarPublicId);
        if (duplicateSlug(error)) throw new UserInputError(`Le slug « ${slug} » est déjà utilisé par un autre leader.`);
        throw error;
      }
    },

    updateLeader: async (_: any, { id, input }: { id: string; input: any }) => {
      const leaderId = assertId(id);
      const data = input || {};
      const before: any = await LeaderModel.findById(leaderId).lean();
      if (!before) throw new UserInputError("Leader introuvable.");

      const set: Record<string, unknown> = {};
      if (data.name !== undefined && data.name !== null) set.name = validateName(data.name);
      if (data.slug !== undefined && data.slug !== null) {
        const slug = validateSlug(data.slug);
        if (slug !== before.slug && (await slugTaken(slug, leaderId))) {
          throw new UserInputError(`Le slug « ${slug} » est déjà utilisé par un autre leader.`);
        }
        set.slug = slug;
      }
      if (data.title !== undefined && data.title !== null) {
        set.title = validateLocalized(data.title, { label: "Le titre", max: TITLE_MAX, requireFr: true });
      }
      if (data.bio !== undefined && data.bio !== null) {
        set.bio = validateLocalized(data.bio, { label: "La biographie", max: BIO_MAX });
      }
      if (data.order !== undefined && data.order !== null) set.order = validateOrder(data.order);
      if (typeof data.isActive === "boolean") set.isActive = data.isActive;

      let newAvatar: Avatar | null = null;
      if (typeof data.avatar === "string" && data.avatar.trim() && data.avatar.trim() !== before.avatar) {
        newAvatar = await processLeaderAvatar(data.avatar);
        set.avatar = newAvatar.avatar;
        set.avatarPublicId = newAvatar.avatarPublicId ?? null;
      }

      let updated: any;
      try {
        updated = await LeaderModel.findByIdAndUpdate(leaderId, { $set: set }, { new: true, runValidators: true }).lean();
      } catch (error) {
        await removeImageQuietly(newAvatar?.avatarPublicId);
        if (duplicateSlug(error)) throw new UserInputError("Ce slug est déjà utilisé par un autre leader.");
        throw error;
      }
      if (!updated) {
        await removeImageQuietly(newAvatar?.avatarPublicId);
        throw new UserInputError("Leader introuvable.");
      }
      // Photo remplacée : l'ancienne image est supprimée de Cloudinary.
      if (newAvatar && before.avatarPublicId && before.avatarPublicId !== newAvatar.avatarPublicId) {
        await removeImageQuietly(before.avatarPublicId);
      }
      return updated;
    },

    deleteLeader: async (_: any, { id }: { id: string }) => {
      const removed: any = await LeaderModel.findByIdAndDelete(assertId(id)).lean();
      if (!removed) return false;
      await removeImageQuietly(removed.avatarPublicId);
      return true;
    },

    reorderLeaders: async (_: any, { ids }: { ids: string[] }) => {
      const list = validateReorderIds(ids, (id) => mongoose.isValidObjectId(id));
      await LeaderModel.bulkWrite(
        list.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: index } } } }))
      );
      return LeaderModel.find().sort(SORT).lean();
    },
  },

  // Les requêtes utilisent .lean() : le document brut n'a que `_id`.
  Leader: {
    id: (l: any) => String(l._id ?? l.id),
    title: (l: any) => l.title ?? {},
    bio: (l: any) => l.bio ?? {},
    order: (l: any) => (typeof l.order === "number" ? l.order : 0),
    isActive: (l: any) => l.isActive !== false,
    createdAt: (l: any) => (l.createdAt ? new Date(l.createdAt).toISOString() : null),
    updatedAt: (l: any) => (l.updatedAt ? new Date(l.updatedAt).toISOString() : null),
  },
};
