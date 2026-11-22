import { UserInputError } from "apollo-server-express";
import { GraphQLContext } from "../../../utils/auth";
import { getSupportContact } from "../../../utils/emailSupport";
import { SupportWhatsappError } from "../../../utils/supportWhatsapp";
import {
  ensureSiteSettingsFresh,
  getCachedSiteSettingsMeta,
  getCachedSupportWhatsapp,
  updateSiteSettings,
} from "../../../services/siteSettings";

/**
 * Paramètres du site. Lecture publique (via le cache mémoire, voir
 * services/siteSettings.ts) ; modification réservée à l'admin
 * (updateSiteSettings est listé dans accessControl.ts).
 */
const toPayload = (context?: GraphQLContext) => {
  const contact = getSupportContact();
  const meta = getCachedSiteSettingsMeta();
  return {
    supportWhatsappDigits: contact.whatsappDigits,
    supportWhatsappDisplay: contact.whatsappDisplay,
    supportWhatsappLink: contact.whatsappLink,
    supportEmail: contact.email,
    isCustomized: Boolean(getCachedSupportWhatsapp()),
    updatedAt: meta.updatedAt ? meta.updatedAt.toISOString() : null,
    // Adresse de l'admin : jamais exposée au public.
    updatedBy: context?.admin ? meta.updatedBy : null,
  };
};

export const siteSettingsResolvers = {
  Query: {
    siteSettings: async (_: unknown, __: unknown, context: GraphQLContext) => {
      await ensureSiteSettingsFresh();
      return toPayload(context);
    },
  },

  Mutation: {
    // Admin uniquement (voir accessControl.ts)
    updateSiteSettings: async (_: unknown, { input }: { input: { supportWhatsapp?: string } }, context: GraphQLContext) => {
      try {
        await updateSiteSettings({ supportWhatsapp: input?.supportWhatsapp }, context?.admin?.email);
      } catch (error) {
        if (error instanceof SupportWhatsappError) throw new UserInputError(error.message);
        throw error;
      }
      return toPayload(context);
    },
  },
};
