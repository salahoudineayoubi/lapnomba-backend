/**
 * Contact institutionnel centralisé — source unique pour l'email support et
 * le numéro WhatsApp support, utilisés par toutes les communications
 * automatiques du backend (pied de page des emails candidat, Reply-To par
 * défaut de sendMail — voir utils/sendMail/index.ts).
 *
 * Politique de communication (voir demande "Global Transactional Email &
 * Contact Standardization") :
 *  - noreply@lapnomba.org : expéditeur de tout email automatique (géré dans
 *    utils/sendMail, pas ici).
 *  - contact@lapnomba.org : canal humain, adresse Reply-To par défaut.
 *  - +237 657 588 317 : numéro WhatsApp support officiel (affichage), même
 *    numéro en format machine (237657588317) pour les liens wa.me.
 *
 * Un seul format canonique est lu depuis l'environnement (SUPPORT_WHATSAPP,
 * avec ou sans "+"/espaces) ; l'affichage et le lien wa.me sont dérivés ici,
 * pas dupliqués ailleurs.
 */

const DEFAULT_SUPPORT_EMAIL = "contact@lapnomba.org";
const DEFAULT_SUPPORT_WHATSAPP = "+237657588317";

export interface SupportContact {
  email: string;
  /** Format affichage : "+237 657 588 317" */
  whatsappDisplay: string;
  /** Format machine (lien wa.me), sans "+"/espaces/tirets : "237657588317" */
  whatsappDigits: string;
  /** Lien wa.me prêt à l'emploi (sans message pré-rempli). */
  whatsappLink: string;
}

/**
 * Formate un numéro en "+CCC XXX XXX XXX" à partir de ses seuls chiffres.
 * Ne suppose pas un format d'entrée particulier — ne conserve que les
 * chiffres puis regroupe par 3, ce qui fonctionne pour le format Cameroun
 * (237 + 9 chiffres = 12 chiffres) utilisé ici.
 */
const formatWhatsappDisplay = (digits: string): string => {
  const groups = digits.match(/.{1,3}/g) || [digits];
  return `+${groups.join(" ")}`;
};

export const getSupportContact = (): SupportContact => {
  const email = (process.env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL).trim();
  const rawWhatsapp = process.env.SUPPORT_WHATSAPP || DEFAULT_SUPPORT_WHATSAPP;
  const whatsappDigits = rawWhatsapp.replace(/[^\d]/g, "");

  return {
    email,
    whatsappDigits,
    whatsappDisplay: formatWhatsappDisplay(whatsappDigits),
    whatsappLink: `https://wa.me/${whatsappDigits}`,
  };
};

/**
 * Adresse Reply-To par défaut de tout email automatique (voir
 * utils/sendMail). Format "Nom Affiché <email>" pour un rendu propre dans
 * les clients mail.
 */
export const getDefaultReplyTo = (): string => {
  const { email } = getSupportContact();
  return `Lap Nomba Support <${email}>`;
};

/**
 * Pied de page support — emails candidat/utilisateur UNIQUEMENT (pas les
 * notifications internes, voir candidature.helpers.ts:sendInternalNotification
 * qui reste volontairement concis).
 *
 * Formulation choisie pour ne jamais contredire le Reply-To réel : le
 * message est bien généré automatiquement, mais une réponse ou un contact
 * direct est explicitement redirigé vers le support, pas ignoré.
 */
export const buildSupportFooterHtml = (): string => {
  const { email, whatsappDisplay, whatsappLink } = getSupportContact();

  return `
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0 16px;" />
        <p style="font-size: 13px; color: #6B7280; line-height: 1.6; margin: 0 0 8px;">
          <strong style="color: #374151;">Besoin d'aide ?</strong><br />
          Ce message a été généré automatiquement. Pour toute question, contactez notre
          équipe support à
          <a href="mailto:${email}" style="color: #2563EB; text-decoration: none;">${email}</a>
          ou via WhatsApp au
          <a href="${whatsappLink}" style="color: #2563EB; text-decoration: none;">${whatsappDisplay}</a>.
        </p>
        <p style="font-size: 12px; color: #9CA3AF; margin: 12px 0 0;">
          Lap Nomba Foundation — Former. Innover. Transformer.
        </p>`;
};

export const buildSupportFooterText = (): string => {
  const { email, whatsappDisplay } = getSupportContact();

  return `

---
Ce message a été généré automatiquement. Pour toute question, contactez notre équipe support à ${email} ou via WhatsApp au ${whatsappDisplay}.

Lap Nomba Foundation — Former. Innover. Transformer.`;
};
