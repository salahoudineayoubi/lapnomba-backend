import { ProjectSummitModel } from "../../../models/project_summit";
import { GraphQLContext } from "../../../utils/auth";
import {
  validateEmail,
  validatePhone,
  validateRequiredText,
} from "../candidature/mutation/candidature.validation";
import { limitPublicForm, sendAcknowledgement, toPublicFormError } from "../publicForm.helpers";

export const projectSummitResolvers = {
  Query: {
    // Admin uniquement (voir accessControl.ts)
    projectSummits: async () => ProjectSummitModel.find().sort({ createdAt: -1 }),
    projectSummit: async (_: any, { id }: { id: string }) => ProjectSummitModel.findById(id),
  },

  Mutation: {
    createProjectSummit: async (_: any, args: any, context: GraphQLContext) => {
      try {
        limitPublicForm("createProjectSummit", context);

        const project = await ProjectSummitModel.create({
          nomComplet: validateRequiredText(args.nomComplet, "Le nom complet", { min: 2, max: 150 }),
          email: validateEmail(args.email),
          numeroWhatsapp: validatePhone(args.numeroWhatsapp),
          nomProjet: validateRequiredText(args.nomProjet, "Le nom du projet", { min: 2, max: 200 }),
          description: validateRequiredText(args.description, "La description", { min: 20, max: 5000 }),
        });

        sendAcknowledgement(project.email, project.nomComplet, "Votre projet a bien été soumis", [
          `Merci d'avoir soumis votre projet « ${project.nomProjet} » à la Lap Nomba Foundation.`,
          "Notre équipe va étudier votre proposition et vous recontactera prochainement.",
        ]);

        return project;
      } catch (error: any) {
        throw toPublicFormError(error, "Ce projet a déjà été soumis.", "Impossible d'enregistrer le projet.");
      }
    },

    // Admin uniquement (voir accessControl.ts)
    updateProjectSummit: async (_: any, { id, ...fields }: any) => {
      const project = await ProjectSummitModel.findByIdAndUpdate(id, fields, { new: true, runValidators: true });
      if (!project) throw new Error("Projet introuvable.");
      return project;
    },

    deleteProjectSummit: async (_: any, { id }: { id: string }) => {
      const result = await ProjectSummitModel.deleteOne({ _id: id });
      return result.deletedCount !== 0;
    },
  },

  ProjectSummit: {
    createdAt: (p: any) => (p.createdAt ? new Date(p.createdAt).toISOString() : null),
    updatedAt: (p: any) => (p.updatedAt ? new Date(p.updatedAt).toISOString() : null),
  },
};
