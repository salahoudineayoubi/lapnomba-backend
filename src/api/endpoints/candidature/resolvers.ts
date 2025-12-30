import Candidature from "../../../models/candidature";
import { uploadFromBase64 } from "../../../utils/cloudinary";
import { sendMail } from "../../../utils/sendMail";

export const candidatureResolvers = {
  Query: {
    candidatures: async () => {
      return await Candidature.find().sort({ createdAt: -1 });
    },
    candidature: async (_: any, { id }: { id: string }) => {
      return await Candidature.findById(id);
    },
  },

  Mutation: {
    createCandidature: async (_: any, { input }: any) => {
      try {
        let photoUrl = input.photo;
        let cvUrl = input.cv;

        // Upload photo si base64
        if (photoUrl && typeof photoUrl === "string" && photoUrl.startsWith("data:")) {
          const uploadRes = await uploadFromBase64(photoUrl, { folder: "candidatures/photos" });
          photoUrl = uploadRes.secure_url;
        }

        // Upload CV si base64
        if (cvUrl && typeof cvUrl === "string" && cvUrl.startsWith("data:")) {
          const uploadRes = await uploadFromBase64(cvUrl, { folder: "candidatures/cv" });
          cvUrl = uploadRes.secure_url;
        }

        // Création de la candidature (seulement les champs utilisés dans les steps)
        const candidature = new Candidature({
          nomComplet: input.nomComplet,
          dateNaissance: input.dateNaissance,
          sexe: input.sexe,
          adresse: input.adresse,
          ville: input.ville,
          pays: input.pays,
          numeroWhatsapp: input.numeroWhatsapp,
          email: input.email,
          photo: photoUrl,

          niveauScolaire: input.niveauScolaire,
          filiere: input.filiere,
          ecole: input.ecole,
          competences: input.competences,
          cv: cvUrl,

          choixFormation: input.choixFormation,
          pourquoiFormation: input.pourquoiFormation,
          ancienZaguina: input.ancienZaguina,
          experienceZaguina: input.experienceZaguina,
          typeFormation: input.typeFormation,

          ordinateur: input.ordinateur,
          niveauInformatique: input.niveauInformatique,
          competencesCles: input.competencesCles,
          accesInternet: input.accesInternet,
          frequenceUtilisation: input.frequenceUtilisation,

          statut: "en attente",
        });

        await candidature.save();
        return candidature;
      } catch (error: any) {
        if (error.code === 11000 && error.keyPattern?.email) {
          throw new Error("Cet email est déjà enregistré.");
        }
        throw error;
      }
    },

    deleteCandidature: async (_: any, { id }: { id: string }) => {
      const res = await Candidature.findByIdAndDelete(id);
      return !!res;
    },

    approuverCandidature: async (_: any, { id }: { id: string }) => {
      const candidature = await Candidature.findByIdAndUpdate(
        id,
        { statut: "approuvée" },
        { new: true }
      );

      if (candidature) {
        const subject = "🎉 Votre candidature a été approuvée – Bienvenue dans le programme";
        const message = `
Cher/Chère ${candidature.nomComplet},

Nous avons le plaisir de vous informer que votre candidature a été **officiellement approuvée**.

Votre profil a retenu toute notre attention et nous sommes convaincus que vous avez le potentiel pour réussir dans notre programme de formation.

📌 **Étape suivante**  
Rejoignez immédiatement notre groupe WhatsApp officiel :  
👉 https://chat.whatsapp.com/FV61Kh1lauV9TBBoUqOefA

Dans ce groupe, vous recevrez :  
— Toutes les informations essentielles  
— Les dates importantes  
— Les accès aux ressources  
— Le calendrier officiel de démarrage

Nous vous félicitons encore pour cette réussite et vous souhaitons la bienvenue parmi nous.

Cordialement,  
**La Direction de la Formation**  
— LAP NOMBA FOUNDATION
        `;
        await sendMail(candidature.email, subject, message);
      }

      return candidature;
    },

    refuserCandidature: async (_: any, { id }: { id: string }) => {
      const candidature = await Candidature.findById(id);

      if (candidature) {
        const subject = "Décision concernant votre candidature";
        const message = `
Cher/Chère ${candidature.nomComplet},

Nous avons attentivement examiné votre candidature.  
Après analyse, nous avons constaté plusieurs éléments indiquant un **manque de sérieux et d’engagement** dans les informations fournies.

Notre programme exige un **minimum de rigueur**, d’honnêteté et d’implication personnelle.  
Toute candidature remplie de manière approximative, incohérente ou fantaisiste ne peut être retenue.

Pour cette raison, votre demande a été **refusée**.

Si vous souhaitez réellement intégrer la formation, nous vous invitons à **revenir avec une candidature complète, sincère et conforme aux attentes**.

Cordialement,  
**La Direction de la Formation**  
— LAP NOMBA FOUNDATION
        `;
        await sendMail(candidature.email, subject, message);
        await Candidature.findByIdAndDelete(id);
      }

      return candidature;
    },
  },
};