import { sendMail } from "../../../utils/sendMail";
import { CommunityVoiceModel } from "../../../models/communityvoice";
import { cleanLocalized } from "../testimonials/resolvers";
import { hasAllLanguages, mergeTranslations, runTranslationInBackground, translateShortTexts } from "../../../services/textTranslation";

/**
 * Traduction IA d'un avis dans les 4 langues (langues vides seulement :
 * les corrections faites dans l'admin sont conservées).
 */
export const translateVoice = async (id: string, client: Parameters<typeof translateShortTexts>[0]) => {
  const voice = await CommunityVoiceModel.findById(id);
  if (!voice || hasAllLanguages(voice.commentI18n)) return;
  const result = await translateShortTexts(client, "short community review of the foundation", { comment: voice.comment });
  voice.commentI18n = mergeTranslations(voice.commentI18n, result.i18n.comment);
  if (!voice.language && result.sourceLanguage) voice.language = result.sourceLanguage;
  await voice.save();
};

import { buildSupportFooterHtml, buildSupportFooterText } from "../../../utils/emailSupport";

const buildCommunityVoiceMail = (
  type: "CONFIRMATION" | "APPROVAL" | "REJECTION",
  name: string
): { subject: string; text: string; html: string } => {
  const safeName = name?.trim() || "Cher contributeur";
  const footerHtml = buildSupportFooterHtml();
  const footerText = buildSupportFooterText();

  const messages = {
    CONFIRMATION: {
      subject: "Confirmation de réception de votre avis - Lap Nomba Foundation",
      text: `Bonjour ${safeName},

Nous vous remercions pour votre contribution à la Lap Nomba Foundation.

Votre avis a bien été reçu et est actuellement en attente de modération par notre équipe.

Nous vous informerons dès qu’il sera approuvé et publié.

Cordialement,
Lap Nomba Foundation${footerText}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Confirmation de réception de votre avis</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous vous remercions pour votre contribution à la
            <strong>Lap Nomba Foundation</strong>.
          </p>
          <p>
            Votre avis a bien été reçu et est actuellement en attente de modération
            par notre équipe.
          </p>
          <p>
            Nous vous informerons dès qu’il sera approuvé et publié.
          </p>
          <p>
            Cordialement,<br />
            <strong>Lap Nomba Foundation</strong>
          </p>${footerHtml}
        </div>
      `,
    },

    APPROVAL: {
      subject: "Votre avis a été approuvé - Lap Nomba Foundation",
      text: `Bonjour ${safeName},

Bonne nouvelle.

Votre avis a été approuvé et publié sur notre plateforme.

Nous vous remercions pour votre contribution à la communauté Lap Nomba et pour votre confiance.

Cordialement,
Lap Nomba Foundation${footerText}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Votre avis a été approuvé</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Bonne nouvelle.
          </p>
          <p>
            Votre avis a été approuvé et publié sur notre plateforme.
          </p>
          <p>
            Nous vous remercions pour votre contribution à la communauté Lap Nomba
            et pour votre confiance.
          </p>
          <p>
            Cordialement,<br />
            <strong>Lap Nomba Foundation</strong>
          </p>${footerHtml}
        </div>
      `,
    },

    REJECTION: {
      subject: "Mise à jour concernant votre avis - Lap Nomba Foundation",
      text: `Bonjour ${safeName},

Nous vous remercions pour votre contribution.

Après examen, votre avis n’a pas été retenu pour publication sur notre plateforme.

Nous vous remercions pour votre compréhension et pour l’intérêt que vous portez aux actions de la Lap Nomba Foundation.

Cordialement,
Lap Nomba Foundation${footerText}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #111827;">
          <h2>Mise à jour concernant votre avis</h2>
          <p>Bonjour <strong>${safeName}</strong>,</p>
          <p>
            Nous vous remercions pour votre contribution.
          </p>
          <p>
            Après examen, votre avis n’a pas été retenu pour publication sur notre plateforme.
          </p>
          <p>
            Nous vous remercions pour votre compréhension et pour l’intérêt que vous
            portez aux actions de la Lap Nomba Foundation.
          </p>
          <p>
            Cordialement,<br />
            <strong>Lap Nomba Foundation</strong>
          </p>${footerHtml}
        </div>
      `,
    },
  };

  return messages[type];
};

export const communityVoiceResolvers = {
  Query: {
    getApprovedVoices: async () => {
      return await CommunityVoiceModel.find({ isApproved: true }).sort({
        createdAt: -1,
      });
    },

    getAllVoicesForAdmin: async () => {
      return await CommunityVoiceModel.find().sort({ createdAt: -1 });
    },
  },

  Mutation: {
    submitCommunityVoice: async (
      _: any,
      { name, email, rating, comment }: any
    ) => {
      try {
        await CommunityVoiceModel.create({
          name,
          email,
          rating,
          comment,
          isApproved: false,
        });

        if (email) {
          try {
            const { subject, text, html } = buildCommunityVoiceMail(
              "CONFIRMATION",
              name
            );

            await sendMail({
              to: email,
              subject,
              text,
              html,
            });
          } catch (mailError) {
            console.error(
              "[CommunityVoice] Erreur envoi mail confirmation :",
              mailError
            );
          }
        }

        return {
          success: true,
          message: "Votre avis a été soumis et est en attente de modération.",
        };
      } catch (error) {
        console.error("[CommunityVoice] Erreur soumission :", error);
        return {
          success: false,
          message: "Erreur lors de la soumission.",
        };
      }
    },

    updateVoiceTranslations: async (
      _: any,
      { id, language, commentI18n }: { id: string; language?: string; commentI18n?: any }
    ) => {
      if (language && !["fr", "en", "tr", "ar"].includes(language)) {
        return { success: false, message: "Langue non prise en charge." };
      }
      const update: Record<string, unknown> = { commentI18n: cleanLocalized(commentI18n) ?? {} };
      if (language) update.language = language;
      const voice = await CommunityVoiceModel.findByIdAndUpdate(id, update, { new: true });
      if (!voice) return { success: false, message: "Avis introuvable." };
      return { success: true, message: "Traductions enregistrées." };
    },

    approveVoice: async (_: any, { id }: { id: string }) => {
      try {
        const voice = await CommunityVoiceModel.findByIdAndUpdate(
          id,
          { isApproved: true },
          { new: true }
        );

        if (!voice) {
          return {
            success: false,
            message: "Avis introuvable.",
          };
        }

        // Avis publié : traduction automatique FR/EN/TR/AR en arrière-plan.
        runTranslationInBackground(`avis ${id}`, (client) => translateVoice(id, client));

        if (voice.email) {
          try {
            const { subject, text, html } = buildCommunityVoiceMail(
              "APPROVAL",
              voice.name
            );

            await sendMail({
              to: voice.email,
              subject,
              text,
              html,
            });
          } catch (mailError) {
            console.error(
              "[CommunityVoice] Erreur envoi mail approbation :",
              mailError
            );
          }
        }

        return {
          success: true,
          message: "Avis approuvé et publié !",
        };
      } catch (error) {
        console.error("[CommunityVoice] Erreur approbation :", error);
        return {
          success: false,
          message: "Erreur lors de l'approbation.",
        };
      }
    },

    deleteVoice: async (_: any, { id }: { id: string }) => {
      try {
        const voice = await CommunityVoiceModel.findById(id);

        if (!voice) {
          return {
            success: false,
            message: "Avis introuvable.",
          };
        }

        await CommunityVoiceModel.findByIdAndDelete(id);

        if (voice.email) {
          try {
            const { subject, text, html } = buildCommunityVoiceMail(
              "REJECTION",
              voice.name
            );

            await sendMail({
              to: voice.email,
              subject,
              text,
              html,
            });
          } catch (mailError) {
            console.error(
              "[CommunityVoice] Erreur envoi mail suppression :",
              mailError
            );
          }
        }

        return {
          success: true,
          message: "Avis supprimé.",
        };
      } catch (error) {
        console.error("[CommunityVoice] Erreur suppression :", error);
        return {
          success: false,
          message: "Erreur lors de la suppression.",
        };
      }
    },
  },
};