import { StudentModel } from "../../../models/students";
import { sendMail } from "../../../utils/sendMail";

export const studentResolvers = {
  Query: {
    students: async () => StudentModel.find().lean(),
    student: async (_: any, { id }: { id: string }) =>
      StudentModel.findById(id).lean(),
  },
  Mutation: {
    createStudent: async (_: any, args: any) => {
      const { email, name, prenom } = args;
      const existing = await StudentModel.findOne({ email, name, prenom });
      if (existing) throw new Error("Cet étudiant existe déjà.");
      const student = new StudentModel({
        ...args,
        dateInscription: new Date(),
      });
      const savedStudent = await student.save();

      // Envoi du mail de bienvenue avec le lien WhatsApp
      await sendMail(
        email,
        "Merci pour votre inscription !",
        `Bonjour ${prenom} ${name},\n\nMerci pour votre inscription ! Rejoignez le forum WhatsApp de Lap Nomba pour accéder aux formations gratuites et échanger avec la communauté : https://chat.whatsapp.com/FV61Kh1lauV9TBBoUqOefA`,
        `<div style="text-align:center;">
          <img src="https://lapnomba.org/static/media/logo.4f1b14335757132cdcb2.png" alt="LapNomba" style="height:90px;" />
          <h2>Bonjour ${prenom} ${name},</h2>
          <p>Merci pour votre inscription !</p>
          <p>Rejoignez le forum WhatsApp de Lap Nomba pour accéder aux <b>formations gratuites</b> et échanger avec la communauté.</p>
          <a href="https://chat.whatsapp.com/FV61Kh1lauV9TBBoUqOefA" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#25D366;color:#fff;text-decoration:none;font-weight:bold;">
            👉 Cliquez ici pour rejoindre le forum WhatsApp
          </a>
          <small style="color:#888;">Ce message est automatique, merci de ne pas répondre.</small>
        </div>`
      );

      return savedStudent.toObject();
    },
    updateStudent: async (_: any, { id, ...rest }: any) => {
      const student = await StudentModel.findByIdAndUpdate(id, rest, { new: true });
      if (!student) throw new Error("Student not found");
      return student.toObject();
    },
    deleteStudent: async (_: any, { id }: { id: string }) => {
      const result = await StudentModel.deleteOne({ _id: id });
      return result.deletedCount !== 0;
    },
  },
};