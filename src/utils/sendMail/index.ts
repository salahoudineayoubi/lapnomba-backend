import nodemailer, { Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import logger from "../logger";

type SendMailParams = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

/**
 * Configuration SMTP — 100% pilotée par variables d'environnement.
 * Aucun mot de passe, aucun host/utilisateur institutionnel codé en dur.
 *
 * SMTP_HOST, SMTP_USER, SMTP_PASS sont obligatoires pour envoyer un email.
 * SMTP_PORT par défaut à 465 (valeur technique, pas un secret).
 * SMTP_FROM_NAME / SMTP_FROM_EMAIL pilotent l'expéditeur affiché ; à défaut
 * de SMTP_FROM_EMAIL, on retombe sur SMTP_USER (la boîte qui authentifie).
 */
const getMailConfig = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 465;

  if (!host || !user || !pass) {
    throw new Error(
      "Configuration SMTP incomplète : SMTP_HOST, SMTP_USER et SMTP_PASS doivent être définis (variables d'environnement)."
    );
  }

  const fromName = process.env.SMTP_FROM_NAME || "Lap Nomba Foundation";
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;

  // Port 465 = SMTPS implicite (secure: true). Tout autre port (587 typiquement)
  // = connexion en clair puis STARTTLS (secure: false, requireTLS: true).
  const secure = port === 465;

  return { host, port, user, pass, fromName, fromEmail, secure };
};

let cachedTransporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

/**
 * Transporter nodemailer réutilisable (lazy singleton).
 * Ne recrée plus une connexion/poignée de main SMTP à chaque email.
 */
const getTransporter = (): Transporter<SMTPTransport.SentMessageInfo> => {
  if (cachedTransporter) return cachedTransporter;

  const { host, port, user, pass, secure } = getMailConfig();

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure, // STARTTLS explicite quand on n'est pas déjà en TLS implicite (465)
    auth: { user, pass },
    tls: {
      // Vérification du certificat activée par défaut. Échappatoire explicite
      // réservée au dev/diagnostic local (jamais silencieuse en production).
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
    },
    connectionTimeout: 30000,
    socketTimeout: 30000,
    family: 4,
  } as SMTPTransport.Options);

  return cachedTransporter;
};

/**
 * Diagnostic — à utiliser au boot ou dans un healthcheck, PAS avant chaque
 * email (voir historique : un `verify()` par envoi doublait inutilement les
 * connexions SMTP). Ne lève jamais : retourne simplement true/false.
 */
export const verifySmtpConnection = async (): Promise<boolean> => {
  try {
    await getTransporter().verify();
    return true;
  } catch (err) {
    logger.error("Échec de la vérification de la connexion SMTP", {
      error: err instanceof Error ? err.message : err,
    });
    return false;
  }
};

export const sendMail = async ({ to, subject, text, html }: SendMailParams) => {
  const { fromName, fromEmail } = getMailConfig();
  const transporter = getTransporter();

  return await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  });
};
