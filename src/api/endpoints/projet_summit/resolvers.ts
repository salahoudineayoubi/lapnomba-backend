// import { ProjectSummitModel } from "../../../models/project_summit";
// import { sendMail } from "../../../utils/sendMail";

// export const projectSummitResolvers = {
//   Query: {
//     projectSummits: async () => ProjectSummitModel.find().lean(),
//     projectSummit: async (_: any, { id }: { id: string }) =>
//       ProjectSummitModel.findById(id).lean(),
//   },
//   Mutation: {
//     createProjectSummit: async (
//       _: any,
//       { nomComplet, email, nomProjet, description, numeroWhatsapp }: any
//     ) => {
//       if (!nomComplet || !email || !nomProjet || !description || !numeroWhatsapp) {
//         throw new Error("Tous les champs sont requis");
//       }
//       const project = new ProjectSummitModel({
//         nomComplet,
//         email,
//         nomProjet,
//         description,
//         numeroWhatsapp,
//       });
//       const savedProject = await project.save();

//       // Envoi du mail de confirmation
//       await sendMail(
//         email,
//         "Votre projet a bien été soumis !",
//         `Bonjour ${nomComplet},

// Merci pour la soumission de votre projet "${nomProjet}" à la Lap Nomba Foundation.
// Notre équipe va analyser votre proposition et vous contactera très prochainement
// afin d’échanger sur les détails, les objectifs et les modalités de collaboration éventuelle.

// En attendant, rejoignez notre communauté WhatsApp pour rester informé(e)
// des actualités, formations et opportunités offertes par Lap Nomba.

// À très bientôt,
// L’équipe Lap Nomba.`,
//         `<div style="text-align:center; font-family:Arial, sans-serif; color:#333;">
//     <img src="https://lapnomba.org/static/media/logo.4f1b14335757132cdcb2.png"
//          alt="LapNomba"
//          style="height:90px; margin-bottom:20px;" />

//     <h2 style="color:#222;">Bonjour ${nomComplet},</h2>
//     <p style="font-size:16px; line-height:1.6;">
//       Merci pour la soumission de votre projet <b>${nomProjet}</b> à la Lap Nomba Foundation.<br><br>
//       Notre équipe va examiner attentivement votre proposition et vous contactera
//       très prochainement pour discuter des modalités, des besoins techniques et
//       des perspectives d’accompagnement.
//     </p>

//     <p style="font-size:16px; line-height:1.6;">
//       En attendant, nous vous invitons à rejoindre notre communauté WhatsApp pour
//       suivre les actualités, les formations et les initiatives inspirantes de Lap Nomba.
//     </p>

//     <a href="https://chat.whatsapp.com/Dl9g1SbyjR5JG0qa8Z5LbM?mode=wwt"
//        style="display:inline-block; margin:25px 0; padding:12px 24px;
//        background:#25D366; color:#fff; text-decoration:none;
//        border-radius:6px; font-weight:bold;">
//        👉 Rejoindre la communauté Lap Nomba
//     </a>

//     <p style="font-size:14px; color:#666;">
//       Ensemble, faisons de la technologie un levier de transformation positive pour la jeunesse camerounaise.
//     </p>

//     <small style="color:#999;">
//       Ce message est automatique, merci de ne pas répondre.
//     </small>
//   </div>`
//       );
//       return savedProject.toObject();
//     },

//     updateProjectSummit: async (
//       _: any,
//       { id, ...fields }: any
//     ) => {
//       const project = await ProjectSummitModel.findByIdAndUpdate(id, fields, { new: true });
//       if (!project) throw new Error("Projet non trouvé");
//       return project.toObject();
//     },

//     deleteProjectSummit: async (_: any, { id }: { id: string }) => {
//       const result = await ProjectSummitModel.deleteOne({ _id: id });
//       return result.deletedCount !== 0;
//     },
//   },
// };