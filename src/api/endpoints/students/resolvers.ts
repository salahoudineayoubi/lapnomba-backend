import { AppDataSource } from "../../../data-source";
import { Student } from "../../../models/students";

const studentRepo = AppDataSource.getRepository(Student);

export const studentResolvers = {
  Query: {
    students: async () => studentRepo.find(),
    student: async (_: any, { id }: { id: number }) =>
      studentRepo.findOne({ where: { id } }),
  },
  Mutation: {
    createStudent: async (_: any, args: any) => {
      const { email, name, prenom } = args;
      const existing = await studentRepo.findOne({ where: { email, name, prenom } });
      if (existing) throw new Error("Cet étudiant existe déjà.");
      const student = studentRepo.create({
        ...args,
        dateInscription: new Date(),
      });
      return studentRepo.save(student);
    },
    updateStudent: async (_: any, { id, ...rest }: any) => {
      const student = await studentRepo.findOne({ where: { id } });
      if (!student) throw new Error("Student not found");
      studentRepo.merge(student, rest);
      return studentRepo.save(student);
    },
    deleteStudent: async (_: any, { id }: { id: number }) => {
      const result = await studentRepo.delete(id);
      return result.affected !== 0;
    },
  },
};