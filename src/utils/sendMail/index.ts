import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export const sendMail = async (to: string, subject: string, text: string) => {
  // Création du transporteur SMTP (typé correctement)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "node26-ca.n0c.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,          // false pour TLS, true pour SSL
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER || "contact@lapnomba.org",
      pass: process.env.SMTP_PASS || "",
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 30000,
    socketTimeout: 30000,
    family: 4,
  } as SMTPTransport.Options); // ⚠️ TypeScript accepte maintenant le host/port/etc.

  try {
    await transporter.verify();
    console.log("SMTP connecté avec succès !");
  } catch (err) {
    console.error("Erreur de connexion SMTP :", err);
    throw new Error("Impossible de se connecter au serveur SMTP");
  }

  return await transporter.sendMail({
    from: `"Fondation Lap Nomba" <${process.env.SMTP_USER || "contact@lapnomba.org"}>`,
    to,
    subject,
    text,
  });
};