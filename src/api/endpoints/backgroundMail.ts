import { sendMail } from "../../utils/sendMail";
import logger from "../../utils/logger";

export type BackgroundMail = Parameters<typeof sendMail>[0];

/**
 * Envoie un e-mail sans faire attendre la réponse de la mutation.
 *
 * Utilisé par les actions de l'admin (approuver, refuser, publier…) : le
 * changement en base est la source de vérité et l'équipe doit avoir une
 * réponse immédiate, même si le serveur SMTP est lent ou indisponible.
 * Un échec d'envoi (y compris une erreur de configuration levée de façon
 * synchrone) est seulement journalisé, jamais propagé.
 *
 * Renvoie la promesse (qui ne rejette jamais) pour les tests ; les
 * appelants ne l'attendent pas.
 */
export const sendMailInBackground = (label: string, mail: BackgroundMail): Promise<void> =>
  Promise.resolve()
    .then(() => sendMail(mail))
    .then(
      () => undefined,
      (error: any) => {
        logger.error(`[${label}] E-mail non envoyé (${mail.subject}) : ${error?.message ?? error}`);
      }
    );

const statutStem = (statut?: string | null): string =>
  (statut || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/e+$/, "");

/**
 * L'admin enregistre « approuvé » / « refusé » alors que certains anciens
 * résolveurs attendaient « approuvée » / « refusée » : on accepte les deux
 * formes (avec ou sans accent, quelle que soit la casse).
 */
export const isApprovedStatut = (statut?: string | null) => statutStem(statut) === "approuv";
export const isRefusedStatut = (statut?: string | null) => statutStem(statut) === "refus";
