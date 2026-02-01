import fs from "fs";
import path from "path";
import { uploadFromBase64 } from "../../../../utils/cloudinary";
import { sendMail } from "../../../../utils/sendMail";

/**
 * Gère l'upload des fichiers.
 * Photo -> Cloudinary
 * CV -> Stockage Local (pour éviter les erreurs d'affichage Cloudinary PDF)
 */
export const handleFileUploads = async (input: any) => {
  let photoUrl = input.photo;
  let cvUrl = input.cv;

  try {
    // 1. Gestion de la Photo (Cloudinary)
    if (photoUrl && photoUrl.startsWith("data:")) {
      const res = await uploadFromBase64(photoUrl, { 
        folder: "candidatures/photos",
        resource_type: "image" 
      });
      photoUrl = res.secure_url;
    }

    // 2. Gestion du CV (Stockage Local)
    if (cvUrl && cvUrl.startsWith("data:")) {
      // On extrait les données Base64
      const base64Data = cvUrl.split(";base64,").pop();
      // On génère un nom de fichier unique
      const fileName = `cv-${Date.now()}-${Math.floor(Math.random() * 1000)}.pdf`;
      
      // On définit les chemins
      const uploadDir = path.join(process.cwd(), "public", "uploads", "cv");
      const filePath = path.join(uploadDir, fileName);

      // Création du dossier s'il n'existe pas
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Écriture du fichier sur le disque
      fs.writeFileSync(filePath, base64Data!, { encoding: 'base64' });

      // On stocke le chemin relatif (ex: /uploads/cv/cv-123.pdf)
      cvUrl = `/uploads/cv/${fileName}`;
    }

    // SÉCURITÉ : Vérification minimale
    if (photoUrl && !photoUrl.startsWith("http")) photoUrl = null;
    // Pour le CV, on vérifie s'il commence par /uploads ou http
    if (cvUrl && !cvUrl.startsWith("/") && !cvUrl.startsWith("http")) cvUrl = null;

    return { photoUrl, cvUrl };
  } catch (error) {
    console.error("Erreur lors du traitement des fichiers:", error);
    return { photoUrl: null, cvUrl: null };
  }
};

/**
 * Gère l'envoi des emails transactionnels
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
  }
};