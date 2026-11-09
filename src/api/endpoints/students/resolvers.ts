import { StudentModel } from "../../../models/students";
import { GraphQLContext } from "../../../utils/auth";
import {
  ValidationError,
  validateEmail,
  validatePhone,
  validateRequiredText,
} from "../candidature/mutation/candidature.validation";
import { limitPublicForm, sendAcknowledgement, toPublicFormError } from "../publicForm.helpers";

const parseBirthDate = (value?: string | null): Date => {
  const date = value ? new Date(value) : null;
  const now = new Date();
  if (!date || Number.isNaN(date.getTime()) || date >= now || date.getFullYear() < 1900) {
    throw new ValidationError("Date de naissance invalide.", "INVALID_DATE_OF_BIRTH");
  }
  return date;
};

const toIso = (value?: Date | string | null) => (value ? new Date(value).toISOString() : null);

export const studentResolvers = {
  Query: {
    // Admin uniquement (voir accessControl.ts)
    students: async () => StudentModel.find().sort({ dateInscription: -1 }),
    student: async (_: any, { id }: { id: string }) => StudentModel.findById(id),
  },

  Mutation: {
    createStudent: async (_: any, args: any, context: GraphQLContext) => {
      try {
        limitPublicForm("createStudent", context);

        const student = await StudentModel.create({
          name: validateRequiredText(args.name, "Le nom", { min: 1, max: 100 }),
          prenom: validateRequiredText(args.prenom, "Le prénom", { min: 1, max: 100 }),
          email: validateEmail(args.email),
          niveauEtude: validateRequiredText(args.niveauEtude, "Le niveau d'étude", { max: 100 }),
          dateNaissance: parseBirthDate(args.dateNaissance),
          ville: validateRequiredText(args.ville, "La ville", { max: 100 }),
          numeroWhatsapp: validatePhone(args.numeroWhatsapp),
        });

        sendAcknowledgement(student.email, student.prenom, "Votre inscription à la Lap Nomba Foundation", [
          "Votre inscription a bien été enregistrée.",
          "Notre équipe vous contactera prochainement avec les prochaines étapes.",
        ]);

        return student;
      } catch (error: any) {
        throw toPublicFormError(
          error,
          "Cet email est déjà inscrit.",
          "Impossible d'enregistrer l'inscription."
        );
      }
    },

    // Admin uniquement (voir accessControl.ts)
    deleteStudent: async (_: any, { id }: { id: string }) => {
      const result = await StudentModel.deleteOne({ _id: id });
      return result.deletedCount !== 0;
    },
  },

  Student: {
    dateNaissance: (s: any) => toIso(s.dateNaissance),
    dateInscription: (s: any) => toIso(s.dateInscription),
  },
};
