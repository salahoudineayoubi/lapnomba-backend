import { ApolloError } from "apollo-server-express";

import AcademyApplication from "../../../../../models/acdemy/application";
import AcademyEnrollment from "../../../../../models/acdemy/enrollment";
import AcademyProgress from "../../../../../models/acdemy/progress";
import AcademyProgram from "../../../../../models/acdemy/program";

import { requireAdmin, GraphQLContext } from "../../../../../utils/auth";
import { checkRateLimit, RateLimitExceededError } from "../../../../../utils/rateLimiter";
import {
  validateAcademyApplicationInput,
  ValidationError,
} from "../../validation/academyApplication.validation";
import { computeAcademyPricing, computeRequiresQuote } from "../../pricing/academy.pricing";

// createAcademyApplication est public (formulaire candidat) — throttle léger
// contre la soumission automatisée, même logique que createCandidature.
const ACADEMY_APPLICATION_RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 };

export const academyApplicationResolvers = {
  Query: {
    academyApplications: async (_: any, __: any, context: GraphQLContext) => {
      requireAdmin(context);
      return await AcademyApplication.find().sort({ createdAt: -1 });
    },

    // Volontairement PUBLIC : réutilisée juste après la création d'une
    // candidature (voir academy_payment/index.tsx) pour réafficher le
    // récapitulatif avant paiement — comportement existant préservé
    // (voir rapport Phase 3, section "Public GraphQL Operations").
    academyApplicationById: async (_: any, { id }: { id: string }) => {
      return await AcademyApplication.findById(id);
    },
  },

  Mutation: {
    createAcademyApplication: async (_: any, { input }: any, context: GraphQLContext) => {
      try {
        checkRateLimit(`academy-application:${context?.ip || "unknown"}`, ACADEMY_APPLICATION_RATE_LIMIT);

        const validated = validateAcademyApplicationInput(input);

        let program = null;
        if (validated.programId) {
          program = await AcademyProgram.findById(validated.programId);
        }

        // Tarif et exigence de devis : jamais repris du client, toujours
        // recalculés côté serveur à partir du programme (protection
        // anti-manipulation de prix — voir Phase 3 "Payment Security").
        const requiresQuote = computeRequiresQuote(
          validated.applicantType,
          validated.trainingMode,
          program
        );
        const pricing = computeAcademyPricing(program, validated.trainingMode);

        const application = new AcademyApplication({
          ...validated,
          requiresQuote,
          ...pricing,
          status: "nouvelle",
        });

        await application.save();

        return application;
      } catch (err) {
        if (err instanceof ValidationError) {
          throw new ApolloError(err.message, "VALIDATION_ERROR");
        }
        if (err instanceof RateLimitExceededError) {
          throw new ApolloError(err.message, "RATE_LIMITED");
        }
        throw err;
      }
    },

    updateAcademyApplication: async (_: any, { input }: any, context: GraphQLContext) => {
      requireAdmin(context);

      const { id, ...updates } = input;

      const application = await AcademyApplication.findByIdAndUpdate(
        id,
        updates,
        { new: true }
      );

      if (!application) {
        throw new Error("Candidature Academy introuvable.");
      }

      return application;
    },

    deleteAcademyApplication: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      requireAdmin(context);
      const deleted = await AcademyApplication.findByIdAndDelete(id);
      return !!deleted;
    },

    // Volontairement PUBLIC malgré son nom : dans le flux actuel, le
    // frontend Academy appelle cette mutation immédiatement après
    // `createAcademyApplication` pour convertir la candidature en
    // inscription et pouvoir déclencher le paiement (voir
    // academy_payment/index.tsx). Ce n'est pas une validation manuelle par
    // un admin — la protéger avec requireAdmin casserait le paiement en
    // ligne. Documenté comme déviation explicite dans le rapport Phase 3.
    // Idempotente (voir `existingEnrollment` ci-dessous) et implicitement
    // throttlée par le rate limit de createAcademyApplication en amont.
    approveAcademyApplication: async (_: any, { id }: { id: string }) => {
      const application = await AcademyApplication.findById(id);

      if (!application) {
        throw new Error("Candidature Academy introuvable.");
      }

      const existingEnrollment = await AcademyEnrollment.findOne({
        applicationId: application._id,
      });

      if (existingEnrollment) {
        return existingEnrollment;
      }

      const enrollment = new AcademyEnrollment({
        applicationId: application._id,
        programId: application.programId,

        studentName: application.fullName,
        email: application.email,
        phone: application.phone,
        whatsapp: application.whatsapp,

        selectedTrack: application.selectedTrack,
        trainingMode: application.trainingMode,

        totalAmount: application.expectedAmount || 0,
        monthlyPrice: application.monthlyPrice || 30000,
        currency: application.currency || "XAF",

        paymentPlan: "monthly",
        paymentStatus: "en_attente",

        status: "active",
        progressPercent: 0,
        completedProjects: 0,
        talentStatus: "non_eligible",
      });

      await enrollment.save();

      await AcademyProgress.create({
        enrollmentId: enrollment._id,
      });

      application.status = "convertie_en_inscription";
      await application.save();

      return enrollment;
    },
  },
};