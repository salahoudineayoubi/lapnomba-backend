import { AppDataSource } from "../../../data-source";
import { Student } from "../../../models/students";
import { sendMail } from "../../../utils/sendMail"; // <-- Ajoute cet import

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
      const savedStudent = await studentRepo.save(student);

      // Envoi du mail de bienvenue avec le lien WhatsApp
      await sendMail(
        email,
        "Merci pour votre inscription !",
        `Bonjour ${prenom} ${name},\n\nMerci pour votre inscription ! Rejoignez le forum WhatsApp de Lap Nomba pour accéder aux formations gratuites et échanger avec la communauté : https://chat.whatsapp.com/VOTRE-LIEN-GROUPE`,
        `<div style="text-align:center;">
          <img src="https://lapnomba.org/static/media/logo.4f1b14335757132cdcb2.png" alt="LapNomba" style="height:90px;" />
          <h2>Bonjour ${prenom} ${name},</h2>
          <p>Merci pour votre inscription !</p>
          <p>Rejoignez le forum WhatsApp de Lap Nomba pour accéder aux <b>formations gratuites</b> et échanger avec la communauté.</p>
          <a href="https://chat.whatsapp.com/VOTRE-LIEN-GROUPE" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#25D366;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
            👉 Cliquez ici pour rejoindre le forum WhatsApp
          </a>
          <small style="color:#888;">Ce message est automatique, merci de ne pas répondre.</small>
        </div>`
      );

      return savedStudent;
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