import { sendMail } from "../../../utils/sendMail";

export const sendAmbassadorEmail = async (email: string, nom: string, type: 'CONFIRMATION' | 'APPROBATION' | 'REFUS') => {
  const contents = {
    CONFIRMATION: {
      subject: "Candidature Ambassadeur reçue - Fondation Lap Nomba",
      body: `Bonjour ${nom},\n\nMerci pour votre intérêt ! Votre candidature pour devenir Ambassadeur Digital de la Fondation Lap Nomba a bien été reçue.\n\nNotre équipe analyse actuellement votre profil et vos plateformes. Vous recevrez une réponse très prochainement.`
    },
    APPROBATION: {
      subject: "Bienvenue parmi nos Ambassadeurs - Fondation Lap Nomba",
      body: `Félicitations ${nom} !\n\nVotre profil a été retenu. Vous faites désormais partie des Ambassadeurs Digitaaux de la Fondation Lap Nomba.\n\nNous vous contacterons sur WhatsApp pour vous transmettre votre kit de bienvenue et discuter de nos prochaines campagnes.`
    },
    REFUS: {
      subject: "Suivi de votre candidature Ambassadeur - Fondation Lap Nomba",
      body: `Bonjour ${nom},\n\nNous avons examiné votre profil avec attention. Malheureusement, nous ne pouvons pas retenir votre candidature pour le moment.\n\nNous vous remercions pour votre engagement et vous encourageons à continuer vos actions positives sur le web.`
    }
  };

  try {
    const { subject, body } = contents[type];
    const footer = `\n\nCordialement,\nLe Responsable de la Communication\nFondation Lap Nomba`;
    await sendMail(email, subject, body + footer);
  } catch (error) {
    console.error(`Erreur email Ambassadeur (${type}):`, error);
  }
};