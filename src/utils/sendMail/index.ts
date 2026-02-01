// utils/sendMail.ts
import nodemailer from "nodemailer";

export const sendMail = async (to: string, subject: string, text: string) => {
  const transporter = nodemailer.createTransport({
    // @ts-ignore
    host: process.env.SMTP_HOST, // Doit être node26-ca.n0c.com
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true, // true pour le port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Ajoute ceci pour forcer l'IPv4 si nécessaire
    tls: {
      rejectUnauthorized: false 
    }
  });

  return await transporter.sendMail({
    from: `"Fondation Lap Nomba" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
  });
};