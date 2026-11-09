import { JoinTeamRequestModel } from "../../../models/join_team_request";
import { GraphQLContext } from "../../../utils/auth";
import {
  validateEmail,
  validatePhone,
  validateRequiredText,
} from "../candidature/mutation/candidature.validation";
import { limitPublicForm, sendAcknowledgement, toPublicFormError } from "../publicForm.helpers";

export const joinTeamRequestResolvers = {
  Query: {
    // Admin uniquement (voir accessControl.ts)
    joinTeamRequests: async () => JoinTeamRequestModel.find().sort({ createdAt: -1 }),
    joinTeamRequest: async (_: any, { id }: { id: string }) => JoinTeamRequestModel.findById(id),
  },

  Mutation: {
    createJoinTeamRequest: async (_: any, args: any, context: GraphQLContext) => {
      try {
        limitPublicForm("createJoinTeamRequest", context);

        const request = await JoinTeamRequestModel.create({
          nomComplet: validateRequiredText(args.nomComplet, "Le nom complet", { min: 2, max: 150 }),
          email: validateEmail(args.email),
          numeroWhatsapp: validatePhone(args.numeroWhatsapp),
          profession: validateRequiredText(args.profession, "La profession", { min: 2, max: 150 }),
          message: validateRequiredText(args.message, "Le message", { min: 10, max: 3000 }),
        });

        sendAcknowledgement(request.email, request.nomComplet, "Votre demande pour rejoindre l'équipe Lap Nomba", [
          "Merci pour votre envie de rejoindre l'équipe de la Lap Nomba Foundation. Votre demande a bien été reçue.",
          "Notre équipe l'étudie et vous recontactera prochainement.",
        ]);

        return request;
      } catch (error: any) {
        throw toPublicFormError(
          error,
          "Une demande existe déjà avec ces coordonnées.",
          "Impossible d'enregistrer la demande."
        );
      }
    },

    // Admin uniquement (voir accessControl.ts)
    updateJoinTeamRequest: async (_: any, { id, ...fields }: any) => {
      const request = await JoinTeamRequestModel.findByIdAndUpdate(id, fields, { new: true, runValidators: true });
      if (!request) throw new Error("Demande introuvable.");
      return request;
    },

    deleteJoinTeamRequest: async (_: any, { id }: { id: string }) => {
      const result = await JoinTeamRequestModel.deleteOne({ _id: id });
      return result.deletedCount !== 0;
    },
  },

  JoinTeamRequest: {
    createdAt: (r: any) => (r.createdAt ? new Date(r.createdAt).toISOString() : null),
    updatedAt: (r: any) => (r.updatedAt ? new Date(r.updatedAt).toISOString() : null),
  },
};
