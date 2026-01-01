import { uploadFromBase64 } from "../../../../utils/cloudinary";
import { sendMail } from "../../../../utils/sendMail";

export const handleFileUploads = async (input: any) => {
  let photoUrl = input.photo;
  let cvUrl = input.cv;

  if (photoUrl?.startsWith("data:")) {
    const res = await uploadFromBase64(photoUrl, { folder: "candidatures/photos" });
    photoUrl = res.secure_url;
  }

  if (cvUrl?.startsWith("data:")) {
    const res = await uploadFromBase64(cvUrl, { folder: "candidatures/cv" });
    cvUrl = res.secure_url;
  }

  return { photoUrl, cvUrl };
};

export const sendStatusEmail = async (email: string, nom: string, type: 'CONFIRMATION' | 'APPROBATION' | 'REFUS') => {
  const contents = {
    CONFIRMATION: {
      subject: "Accusé de réception de votre candidature - Fondation Lap Nomba",
      body: `Bonjour ${nom},

Nous vous confirmons la réception de votre dossier de candidature au sein de la Fondation Lap Nomba. Votre intérêt pour nos programmes d'excellence numérique a bien été enregistré.

Pour suivre l'actualité de la sélection en temps réel, il est impératif de rejoindre notre canal d'information officiel :
Lien de la chaîne : https://whatsapp.com/channel/0029VajVvS65vKA4XvB0mC3m

Prochaines étapes du processus :
1. Évaluation technique et administrative de votre dossier.
2. Publication de la liste des candidats présélectionnés.
3. Session d'orientation pour les candidats retenus.

Nous vous remercions de votre patience durant cette phase d'étude.`
    },
    APPROBATION: {
      subject: "Notification d'admission - Fondation Lap Nomba",
      body: `Bonjour ${nom},

Nous avons le plaisir de vous informer que votre candidature a été officiellement approuvée par le comité de sélection.

Votre profil correspond aux standards d'excellence que nous recherchons.  
Pour finaliser votre intégration et recevoir le calendrier officiel de formation, veuillez laisser un message à notre assistant virtuel sur WhatsApp en cliquant sur le lien suivant :

👉 https://wa.me/237672018999

Notre équipe vous ajoutera ensuite dans nos différents forums et groupes de travail dédiés.


Félicitations pour cette admission.`
    },
    REFUS: {
      subject: "Décision concernant votre candidature - Fondation Lap Nomba",
      body: `Bonjour ${nom},

Nous avons procédé à l'examen attentif de votre candidature. Malheureusement, nous avons le regret de vous informer que votre dossier n'a pas été retenu pour cette session.

Cette décision fait suite à un manque de précision, de cohérence ou de rigueur dans les informations fournies lors de votre inscription. Notre programme exigeant un haut niveau de sérieux dès la phase de candidature, nous ne pouvons donner suite à votre demande.

Nous vous encourageons à faire preuve de plus de diligence lors de vos prochaines démarches.`
    }
  };

  const { subject, body } = contents[type];
  
  const footer = `

Cordialement,

La Direction de la Formation
Fondation Lap Nomba
Former Pour Transformer`;

  await sendMail(email, subject, body + footer);
};