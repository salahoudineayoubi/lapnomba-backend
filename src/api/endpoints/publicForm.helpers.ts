import { UserInputError } from "apollo-server-express";
import { GraphQLContext } from "../../utils/auth";
import { checkRateLimit, RateLimitExceededError } from "../../utils/rateLimiter";
import { sendMail } from "../../utils/sendMail";
import { buildSupportFooterHtml, buildSupportFooterText } from "../../utils/emailSupport";
import logger from "../../utils/logger";
import { ValidationError } from "./candidature/mutation/candidature.validation";

/**
 * Outils communs aux formulaires publics simples du site principal
 * (rejoindre l'équipe, soumettre un projet, inscription élève).
 */

export const PUBLIC_FORM_RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

export const limitPublicForm = (operation: string, context: GraphQLContext) => {
  if (context?.ip) checkRateLimit(`${operation}:${context.ip}`, PUBLIC_FORM_RATE_LIMIT);
};

/** Convertit les erreurs connues en erreurs lisibles côté formulaire. */
export const toPublicFormError = (error: any, duplicateMessage: string, fallback: string): Error => {
  if (error?.code === 11000) return new UserInputError(duplicateMessage, { reason: "DUPLICATE" });
  if (error instanceof ValidationError) {
    return new UserInputError(error.message, { reason: error.reason ?? "INVALID_INPUT" });
  }
  if (error instanceof RateLimitExceededError) return error;
  logger.error(`${fallback} ${error?.message ?? error}`);
  return new Error(fallback);
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/**
 * Accusé de réception envoyé en arrière-plan : la réponse au formulaire
 * n'attend jamais le serveur SMTP, et un échec d'envoi ne fait jamais
 * échouer l'enregistrement.
 */
export const sendAcknowledgement = (to: string, name: string, subject: string, paragraphs: string[]) => {
  const safeName = escapeHtml(name);
  const text = [`Bonjour ${name},`, ...paragraphs, "L'équipe Lap Nomba Foundation", buildSupportFooterText()].join("\n\n");
  const html = `<div style="font-family:Arial,sans-serif;color:#333;line-height:1.6">
  <h2 style="color:#222">Bonjour ${safeName},</h2>
  ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n  ")}
  <p>L'équipe Lap Nomba Foundation</p>
  ${buildSupportFooterHtml()}
</div>`;

  void sendMail({ to, subject, text, html }).catch((error: any) => {
    logger.error(`Accusé de réception non envoyé (${subject}) : ${error?.message ?? error}`);
  });
};
