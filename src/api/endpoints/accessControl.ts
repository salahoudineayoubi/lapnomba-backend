import { requireAdmin, GraphQLContext } from "../../utils/auth";

/**
 * Contrôle d'accès centralisé de l'API GraphQL.
 *
 * 1. ADMIN_ONLY_OPERATIONS : opérations réservées à l'app admin (lecture de
 *    données personnelles, modération, suppression). Elles sont enveloppées
 *    par `requireAdmin` au démarrage. Toute opération listée ici qui n'existe
 *    pas fait échouer le démarrage (protection contre les fautes de frappe
 *    et les renommages silencieux).
 *
 *    Les opérations Academy et candidatures appellent déjà `requireAdmin`
 *    dans leurs propres resolvers et ne sont donc pas répétées ici.
 *
 * 2. privacyFieldResolvers : masque les coordonnées personnelles dans les
 *    réponses publiques (ex: `donationById` utilisé par la page de suivi de
 *    paiement, liste publique des campagnes).
 */
export const ADMIN_ONLY_OPERATIONS = {
  Query: [
    // Dons
    "donations",
    "donationStats",
    "materialDonations",
    "sponsorships",
    "materials",
    "material",
    // Newsletter
    "newsletterSubscribers",
    "newsletterSubscriber",
    // Bénévolat / engagement
    "ambassadors",
    "ambassadorById",
    "psychosocials",
    "awarenessAgents",
    "developers",
    "developer",
    // Partenaires
    "partners",
    "partner",
    // Voix de la communauté (modération)
    "getAllVoicesForAdmin",
    // Mentors bénévoles
    "mentorApplications",
  ],
  Mutation: [
    // Dons
    "markBankTransferAsCompleted",
    "markBankTransferAsFailed",
    "deleteDonation",
    "deleteMaterial",
    // Newsletter
    "updateNewsletterSubscriber",
    "deleteNewsletterSubscriber",
    // Témoignages (gérés depuis l'admin)
    "createTestimonial",
    "updateTestimonial",
    "deleteTestimonial",
    // Bénévolat / engagement
    "updateAmbassadorStatus",
    "deleteAmbassador",
    "updatePsychosocialStatus",
    "updateAwarenessAgentStatus",
    "deleteDeveloper",
    // Partenaires
    "deletePartner",
    // Voix de la communauté
    "approveVoice",
    "deleteVoice",
    // Mentors bénévoles
    "updateMentorApplicationStatus",
  ],
} as const;

type ResolverMap = Record<string, any>;

export const applyAdminGuards = (resolverMaps: ResolverMap[]): ResolverMap[] => {
  const found = new Set<string>();

  const guarded = resolverMaps.map((map) => {
    const copy: ResolverMap = { ...map };

    for (const type of ["Query", "Mutation"] as const) {
      if (!map[type]) continue;
      const adminOps: readonly string[] = ADMIN_ONLY_OPERATIONS[type];
      copy[type] = { ...map[type] };

      for (const name of Object.keys(map[type])) {
        if (!adminOps.includes(name)) continue;
        const original = map[type][name];
        copy[type][name] = (parent: any, args: any, context: GraphQLContext, info: any) => {
          requireAdmin(context);
          return original(parent, args, context, info);
        };
        found.add(`${type}.${name}`);
      }
    }

    return copy;
  });

  const missing = (["Query", "Mutation"] as const).flatMap((type) =>
    ADMIN_ONLY_OPERATIONS[type].filter((name) => !found.has(`${type}.${name}`)).map((n) => `${type}.${n}`)
  );

  if (missing.length > 0) {
    throw new Error(`accessControl: opérations admin introuvables dans les resolvers : ${missing.join(", ")}`);
  }

  return guarded;
};

// ---------------------------------------------------------------------------
// Masquage des données personnelles pour les appels non-admin
// ---------------------------------------------------------------------------

export const maskEmail = (email?: string | null): string => {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
};

export const maskPhone = (phone?: string | null): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\s+/g, "");
  return digits.length <= 2 ? "**" : `${"*".repeat(digits.length - 2)}${digits.slice(-2)}`;
};

const adminOr = <T>(context: GraphQLContext, value: T, masked: T): T =>
  context?.admin ? value : masked;

export const privacyFieldResolvers: ResolverMap = {
  Donation: {
    donorEmail: (d: any, _: any, ctx: GraphQLContext) => adminOr(ctx, d.donorEmail, maskEmail(d.donorEmail)),
    donorPhone: (d: any, _: any, ctx: GraphQLContext) => adminOr(ctx, d.donorPhone ?? null, maskPhone(d.donorPhone)),
    bankTransfer: (d: any, _: any, ctx: GraphQLContext) => adminOr(ctx, d.bankTransfer ?? null, null),
  },
  CrowdfundingCampaign: {
    organizerEmail: (c: any, _: any, ctx: GraphQLContext) =>
      adminOr(ctx, c.organizerEmail, maskEmail(c.organizerEmail)),
  },
};
