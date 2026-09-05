import { UserInputError } from "apollo-server-express";
import { EventModel } from "../../../models/event";
import { requireAdmin, GraphQLContext } from "../../../utils/auth";
import { uploadFromBase64 } from "../../../utils/cloudinary";
import { validateUploadedFile, FileValidationError } from "../../../utils/fileValidation";
import logger from "../../../utils/logger";

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 Mo

/**
 * Traite la liste d'images fournie par l'admin :
 *  - une data URI ("data:...;base64,...") est validée (type réel + taille)
 *    puis uploadée sur Cloudinary ;
 *  - une URL http(s) existante (image déjà uploadée, conservée telle quelle
 *    lors d'une mise à jour) est gardée sans retraitement ;
 *  - toute autre valeur est ignorée.
 */
const processEventImages = async (images: string[] | undefined): Promise<string[]> => {
  if (!images || images.length === 0) return [];

  const results: string[] = [];

  for (const image of images) {
    if (typeof image !== "string" || !image.trim()) continue;

    if (image.startsWith("data:")) {
      validateUploadedFile(image, {
        allowedMimes: ALLOWED_IMAGE_MIMES,
        maxBytes: MAX_IMAGE_BYTES,
        label: "Image d'événement",
      });

      const uploaded = await uploadFromBase64(image, {
        folder: "events",
        resource_type: "image",
      });

      results.push(uploaded.secure_url);
    } else if (image.startsWith("http")) {
      results.push(image);
    }
  }

  return results;
};

const validateEventInput = (input: any, { partial = false }: { partial?: boolean } = {}) => {
  if (!partial || input.titre !== undefined) {
    const titre = (input.titre || "").trim();
    if (!titre) throw new UserInputError("Le titre de l'événement est requis.");
  }

  if (!partial || input.description !== undefined) {
    const description = (input.description || "").trim();
    if (!description) throw new UserInputError("La description de l'événement est requise.");
  }

  if (!partial || input.dateEvenement !== undefined) {
    const date = new Date(input.dateEvenement);
    if (isNaN(date.getTime())) {
      throw new UserInputError("La date de l'événement est invalide.");
    }
  }

  if (input.statut !== undefined && !["brouillon", "publie"].includes(input.statut)) {
    throw new UserInputError('Le statut doit être "brouillon" ou "publie".');
  }
};

export const eventResolvers = {
  Query: {
    publicEvents: async () => {
      return await EventModel.find({ statut: "publie" }).sort({ dateEvenement: -1 });
    },

    events: async (_: any, __: any, context: GraphQLContext) => {
      requireAdmin(context);
      return await EventModel.find().sort({ dateEvenement: -1 });
    },

    event: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      requireAdmin(context);
      return await EventModel.findById(id);
    },
  },

  Mutation: {
    createEvent: async (_: any, { input }: any, context: GraphQLContext) => {
      requireAdmin(context);
      validateEventInput(input);

      try {
        const images = await processEventImages(input.images);

        const event = await EventModel.create({
          titre: input.titre.trim(),
          description: input.description.trim(),
          contenu: input.contenu?.trim(),
          lieu: input.lieu?.trim(),
          categorie: input.categorie?.trim(),
          dateEvenement: new Date(input.dateEvenement),
          images,
          statut: input.statut === "publie" ? "publie" : "brouillon",
        });

        return event;
      } catch (error: any) {
        if (error instanceof FileValidationError) {
          throw new UserInputError(error.message);
        }
        logger.error("Erreur lors de la création d'un événement", {
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    },

    updateEvent: async (_: any, { input }: any, context: GraphQLContext) => {
      requireAdmin(context);
      const { id, ...rest } = input;
      validateEventInput(rest, { partial: true });

      try {
        const updates: Record<string, any> = {};

        if (rest.titre !== undefined) updates.titre = rest.titre.trim();
        if (rest.description !== undefined) updates.description = rest.description.trim();
        if (rest.contenu !== undefined) updates.contenu = rest.contenu?.trim();
        if (rest.lieu !== undefined) updates.lieu = rest.lieu?.trim();
        if (rest.categorie !== undefined) updates.categorie = rest.categorie?.trim();
        if (rest.dateEvenement !== undefined) updates.dateEvenement = new Date(rest.dateEvenement);
        if (rest.statut !== undefined) updates.statut = rest.statut;
        if (rest.images !== undefined) updates.images = await processEventImages(rest.images);

        const event = await EventModel.findByIdAndUpdate(id, updates, { new: true });

        if (!event) {
          throw new UserInputError("Événement introuvable.");
        }

        return event;
      } catch (error: any) {
        if (error instanceof FileValidationError) {
          throw new UserInputError(error.message);
        }
        if (error instanceof UserInputError) throw error;
        logger.error("Erreur lors de la mise à jour d'un événement", {
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    },

    deleteEvent: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      requireAdmin(context);
      const result = await EventModel.findByIdAndDelete(id);
      return !!result;
    },
  },

  Event: {
    id: (parent: any) => parent._id?.toString() ?? parent.id,
    dateEvenement: (parent: any) =>
      parent.dateEvenement ? new Date(parent.dateEvenement).toISOString() : null,
    createdAt: (parent: any) =>
      parent.createdAt ? new Date(parent.createdAt).toISOString() : null,
    updatedAt: (parent: any) =>
      parent.updatedAt ? new Date(parent.updatedAt).toISOString() : null,
  },
};
