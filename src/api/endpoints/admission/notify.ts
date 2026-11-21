/** Admissions v2 — e-mail de confirmation au candidat (n° de dossier + lien de suivi). */
import { sendMail } from "../../../utils/sendMail";
import logger from "../../../utils/logger";
import { escapeHtml } from "../../../utils/internalNotifications";
import { buildSupportFooterHtml, buildSupportFooterText } from "../../../utils/emailSupport";

const admissionsUrl = () => (process.env.ADMISSIONS_APP_URL || "https://admissions.lapnomba.org").replace(/\/+$/, "");

export const sendApplicationReceivedV2 = async (c: any) => {
  try {
    const prenom = String(c.nomComplet || "").trim().split(/\s+/).slice(-1)[0] || "";
    const suivi = `${admissionsUrl()}/suivi?ref=${encodeURIComponent(c.reference)}`;
    const subject = `Candidature reçue — dossier ${c.reference}`;
    const text = `Bonjour ${prenom},

Votre candidature à la Fondation Lap Nomba a bien été reçue.

Numéro de dossier : ${c.reference}
Formation choisie : ${c.choixFormation}

Prochaines étapes :
1. Notre équipe vérifie votre pièce d'identité et étudie votre dossier.
2. Les candidats présélectionnés sont contactés pour un entretien.
3. La décision vous est envoyée par e-mail.

Suivre votre candidature : ${suivi}

Fondation Lap Nomba — Sensibiliser. Former. Intégrer.` + buildSupportFooterText();
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827; max-width: 560px;">
        <h2 style="margin: 0 0 12px;">Candidature reçue ✅</h2>
        <p>Bonjour ${escapeHtml(prenom)},</p>
        <p>Votre candidature à la Fondation Lap Nomba a bien été reçue.</p>
        <p style="font-size: 18px;">Numéro de dossier : <strong style="color: #2836C4;">${escapeHtml(c.reference)}</strong><br/>
        Formation choisie : <strong>${escapeHtml(c.choixFormation)}</strong></p>
        <p><strong>Prochaines étapes</strong></p>
        <ol>
          <li>Notre équipe vérifie votre pièce d'identité et étudie votre dossier.</li>
          <li>Les candidats présélectionnés sont contactés pour un entretien.</li>
          <li>La décision vous est envoyée par e-mail.</li>
        </ol>
        <p style="margin: 22px 0;">
          <a href="${escapeHtml(suivi)}" style="display: inline-block; background: #2836C4; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: bold;">Suivre ma candidature</a>
        </p>
        ${buildSupportFooterHtml()}
      </div>`;
    await sendMail({ to: c.email, subject, text, html });
  } catch (err) {
    logger.error("Échec de l'e-mail de confirmation (admissions v2)", { error: err instanceof Error ? err.message : err });
  }
};
