import nodemailer from "nodemailer";

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: '"LapNomba" <no-reply@lapnomba.org>',
    to,
    subject,
    text,
    html, 
  });
}