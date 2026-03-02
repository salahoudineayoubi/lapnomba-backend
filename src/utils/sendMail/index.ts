
import nodemailer from "nodemailer";

export const sendMail = async (to: string, subject: string, text: string) => {

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "node26-ca.n0c.com", // ton serveur distant
    port: Number(process.env.SMTP_PORT) || 465,          // port SSL
    secure: true, // true pour 465, false pour 587
    auth: {
      user: process.env.SMTP_USER || "contact@lapnomba.org",
      pass: process.env.SMTP_PASS, // mot de passe du compte
    },
    tls: {
      rejectUnauthorized: false, // permet de passer les certificats auto-signés si besoin
    },
  });

  // Envoyer l'email
  return await transporter.sendMail({
    from: `"Fondation Lap Nomba" <${process.env.SMTP_USER || "contact@lapnomba.org"}>`,
    to,
    subject,
    text,
  });
};