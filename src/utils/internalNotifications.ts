/**
 * Notifications internes (équipe Lap Nomba) — gabarit commun et liens admin.
 *
 * Boîtes de réception, toutes surchargeables par variable d'environnement :
 *  - dons        → DONATION_NOTIFICATION_EMAIL (défaut donate@lapnomba.org)
 *  - candidatures → TRAINING_NOTIFICATION_EMAIL (défaut training@lapnomba.org,
 *    voir candidature.helpers.ts)
 *
 * Chaque notification contient un bouton qui ouvre directement la bonne page
 * de l'admin (ADMIN_APP_URL, défaut https://admin.lapnomba.org). L'admin reste
 * la source de vérité : l'email n'est qu'un résumé opérationnel.
 */
import logger from "./logger";
import { sendMail } from "./sendMail";

const DEFAULT_ADMIN_APP_URL = "https://admin.lapnomba.org";
const DEFAULT_DONATION_NOTIFICATION_EMAIL = "donate@lapnomba.org";

export const getAdminAppUrl = (): string =>
  (process.env.ADMIN_APP_URL || DEFAULT_ADMIN_APP_URL).trim().replace(/\/+$/, "");

/** Lien vers une page de l'admin, avec paramètres de requête encodés. */
export const adminLink = (path: string, query?: Record<string, string | undefined>): string => {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const qs = params.toString();
  return `${getAdminAppUrl()}${path.startsWith("/") ? path : `/${path}`}${qs ? `?${qs}` : ""}`;
};

export const getDonationNotificationEmail = (): string =>
  (process.env.DONATION_NOTIFICATION_EMAIL || DEFAULT_DONATION_NOTIFICATION_EMAIL).trim();

export const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Valeur sûre pour un sujet d'email : pas de retour à la ligne (injection d'en-tête). */
export const safeSubject = (value: unknown): string =>
  String(value ?? "").replace(/[\r\n]+/g, " ").trim();

export const formatDateFr = (date?: Date | string | number): string =>
  new Date(date ?? Date.now()).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Douala",
  });

export const formatAmount = (amount?: number, currency?: string): string => {
  if (amount === undefined || amount === null) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency || "XAF",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency || ""}`.trim();
  }
};

type Row = [label: string, value: unknown];

/**
 * Corps texte + HTML d'une notification interne : titre, tableau de champs,
 * bouton vers l'admin. Toutes les valeurs sont échappées.
 */
export const buildInternalMail = ({
  title,
  rows,
  ctaLabel,
  ctaUrl,
}: {
  title: string;
  rows: Row[];
  ctaLabel: string;
  ctaUrl: string;
}): { text: string; html: string } => {
  const visible = rows.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "");

  const text = [
    title,
    "",
    ...visible.map(([k, v]) => `${k} : ${v}`),
    "",
    `${ctaLabel} : ${ctaUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827; max-width: 560px;">
      <h2 style="margin: 0 0 16px;">${escapeHtml(title)}</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tbody>
          ${visible
            .map(
              ([k, v]) =>
                `<tr><td style="padding: 6px 12px 6px 0; color: #6B7280; vertical-align: top; white-space: nowrap;">${escapeHtml(
                  k
                )}</td><td style="padding: 6px 0;"><strong>${escapeHtml(v)}</strong></td></tr>`
            )
            .join("")}
        </tbody>
      </table>
      <p style="margin: 24px 0 8px;">
        <a href="${escapeHtml(ctaUrl)}"
           style="display: inline-block; background: #2836C4; color: #FFFFFF; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: bold;">
          ${escapeHtml(ctaLabel)}
        </a>
      </p>
      <p style="margin: 0; color: #6B7280; font-size: 12px;">
        Lien direct : <a href="${escapeHtml(ctaUrl)}" style="color: #2836C4;">${escapeHtml(ctaUrl)}</a>
      </p>
    </div>
  `;

  return { text, html };
};

/** Envoi non bloquant : une notification interne ne doit jamais faire échouer le flux métier. */
export const sendInternalMailSilently = (to: string, subject: string, body: { text: string; html: string }, context: string) => {
  sendMail({ to, subject, ...body }).catch((err) => {
    logger.error(`Échec de la notification interne (${context})`, {
      to,
      error: err instanceof Error ? err.message : err,
    });
  });
};
