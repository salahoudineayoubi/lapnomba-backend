import { uploadFromBase64 } from "../../../../utils/cloudinary";
import { sendMail } from "../../../../utils/sendMail";

/**
 * Gère l'upload des fichiers vers Cloudinary
 * Retourne impérativement des URLs complètes (https://...)
 */
export const handleFileUploads = async (input: any) => {
  let photoUrl = input.photo;
  let cvUrl = input.cv;

  try {
    // 1. Gestion de la Photo
    // On n'upload que si c'est du base64 (commence par data:)
    if (photoUrl && photoUrl.startsWith("data:")) {
      const res = await uploadFromBase64(photoUrl, { 
        folder: "candidatures/photos",
        resource_type: "image" 
      });
      photoUrl = res.secure_url; // Récupère l'URL complète
    }

    // 2. Gestion du CV (PDF)
    if (cvUrl && cvUrl.startsWith("data:")) {
      const res = await uploadFromBase64(cvUrl, { 
        folder: "candidatures/cv",
        resource_type: "auto" // Auto détecte le PDF
      });
      cvUrl = res.secure_url; // Récupère l'URL complète
    }

    // SÉCURITÉ : Si à ce stade l'URL ne commence pas par http, 
    // c'est que l'upload a échoué ou que la donnée est corrompue.
    // On nettoie pour éviter l'erreur "No routes matched" au frontend.
    if (photoUrl && !photoUrl.startsWith("http")) photoUrl = null;
    if (cvUrl && !cvUrl.startsWith("http")) cvUrl = null;

    return { photoUrl, cvUrl };
  } catch (error) {
    console.error("Erreur lors de l'upload Cloudinary:", error);
    // En cas d'erreur, on retourne les valeurs originales ou null
    return { photoUrl: null, cvUrl: null };
  }
};

/**
 * Gère l'envoi des emails transactionnels selon le statut
 */
export const sendStatusEmail = async (email: string, nom: string, type: 'CONFIRMATION' | 'APPROBATION' | 'REFUS') => {
  const contents = {
    CONFIRMATION: {
      subject: "Accusé de réception - Fondation Lap Nomba",
      body: `Bonjour ${nom},\n\nNous vous confirmons la bonne réception de votre dossier de candidature. Notre équipe procède actuellement à l'évaluation technique.`
    },
    APPROBATION: {
      subject: "Félicitations - Admission Fondation Lap Nomba",
      body: `Bonjour ${nom},\n\nNous avons le plaisir de vous informer que votre candidature a été approuvée !\n\nProchaine étape : Contactez notre équipe sur WhatsApp pour rejoindre votre groupe de formation :\n👉 https://wa.me/237672018999`
    },
    REFUS: {
      subject: "Décision concernant votre candidature - Fondation Lap Nomba",
      body: `Bonjour ${nom},\n\nAprès examen de votre dossier, nous avons le regret de vous informer que nous ne pouvons pas donner une suite favorable à votre demande pour cette session.\n\nNous vous encourageons à persévérer dans vos projets.`
    }
  };

  try {
    const { subject, body } = contents[type];
    const footer = `\n\nCordialement,\nLa Direction de la Formation\nFondation Lap Nomba\n"Transformer pour impacter"`;

    await sendMail(email, subject, body + footer);
  } catch (error) {
    console.error(`Erreur lors de l'envoi de l'email (${type}) à ${email}:`, error);
    // On ne bloque pas le processus si l'email échoue
  }
};