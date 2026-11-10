import OpenAI from "openai";
import SYSTEM_PROMPT from "../../promt";
import { GraphQLContext } from "../../../utils/auth";
import { checkRateLimit, RateLimitExceededError } from "../../../utils/rateLimiter";
import logger from "../../../utils/logger";

// Chaque appel est facturé : limite par IP et taille maximale des messages.
const CHATBOT_RATE_LIMIT = { maxRequests: 20, windowMs: 10 * 60 * 1000 };
const MAX_PROMPT_LENGTH = 1000;
const MAX_HISTORY_TURNS = 8;
// Modèle principal : modèle qui raisonne + recherche web (API Responses).
// Modèle de secours : appel simple sans outils si le principal échoue.
const DEFAULT_MODEL = "gpt-5-mini";
const DEFAULT_FALLBACK_MODEL = "gpt-4o-mini";
const REASONING_EFFORTS = ["minimal", "low", "medium", "high"] as const;
type Effort = (typeof REASONING_EFFORTS)[number];

const env = (key: string) => (process.env[key] || "").trim();
const chatbotConfig = () => {
  const effort = env("CHATBOT_REASONING_EFFORT").toLowerCase() as Effort;
  return {
    model: env("CHATBOT_MODEL") || DEFAULT_MODEL,
    fallbackModel: env("CHATBOT_FALLBACK_MODEL") || DEFAULT_FALLBACK_MODEL,
    effort: REASONING_EFFORTS.includes(effort) ? effort : ("low" as Effort),
    // Recherche web activée par défaut ; CHATBOT_WEB_SEARCH=false pour la couper.
    webSearch: env("CHATBOT_WEB_SEARCH").toLowerCase() !== "false",
  };
};

let client: OpenAI | null | undefined;
const getClient = () => {
  if (client === undefined) {
    const apiKey = env("OPENAI_API_KEY");
    client = apiKey ? new OpenAI({ apiKey, timeout: 60_000, maxRetries: 1 }) : null;
  }
  return client;
};

/**
 * Le widget n'affiche pas le markdown : liens [titre](url) → « titre : url »,
 * gras retiré, paramètres de suivi retirés des URL.
 */
export const toPlainText = (text: string): string =>
  text
    .replace(/\(?\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\)?/g, "$1 : $2")
    .replace(/[?&]utm_source=openai/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();

type Lang = "fr" | "en" | "tr" | "ar";
const normalizeLang = (value?: string | null): Lang => {
  const l = (value || "").slice(0, 2).toLowerCase();
  return l === "en" || l === "tr" || l === "ar" ? l : "fr";
};

const LANGUAGE_NAMES: Record<Lang, string> = { fr: "French", en: "English", tr: "Turkish", ar: "Arabic" };

/** Message de secours (jamais d'écran vide côté site). */
export const fallbackMessage = (lang: Lang, reason: "unavailable" | "rate_limited"): string => {
  const contact = "https://wa.me/237657588317\nsupport@lapnomba.org";
  const messages: Record<Lang, Record<typeof reason, string>> = {
    fr: {
      unavailable: `Je ne peux pas répondre pour le moment 🙏 Notre équipe reste disponible :\n${contact}`,
      rate_limited: `Vous avez envoyé beaucoup de messages en peu de temps. Réessayez dans quelques minutes, ou écrivez à notre équipe :\n${contact}`,
    },
    en: {
      unavailable: `I can't answer right now 🙏 Our team is here for you:\n${contact}`,
      rate_limited: `You've sent many messages in a short time. Please try again in a few minutes, or contact our team:\n${contact}`,
    },
    tr: {
      unavailable: `Şu anda yanıt veremiyorum 🙏 Ekibimiz size yardımcı olabilir:\n${contact}`,
      rate_limited: `Kısa sürede çok fazla mesaj gönderdiniz. Birkaç dakika sonra tekrar deneyin veya ekibimize yazın:\n${contact}`,
    },
    ar: {
      unavailable: `لا أستطيع الرد حاليًا 🙏 فريقنا في خدمتك:\n${contact}`,
      rate_limited: `لقد أرسلت رسائل كثيرة في وقت قصير. حاول مرة أخرى بعد بضع دقائق، أو تواصل مع فريقنا:\n${contact}`,
    },
  };
  return messages[lang][reason];
};

const cleanHistory = (history: any): { role: "user" | "assistant"; content: string }[] =>
  (Array.isArray(history) ? history : [])
    .filter((t) => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ role: t.role, content: t.content.trim().slice(0, MAX_PROMPT_LENGTH * 2) }));

export const chatbotResolvers = {
  Mutation: {
    chatbotPrompt: async (
      _: any,
      { prompt, history, language }: { prompt: string; history?: any[]; language?: string },
      context: GraphQLContext
    ) => {
      const text = (prompt || "").trim();
      const lang = normalizeLang(language);

      if (!text) throw new Error("Le message est requis.");
      if (text.length > MAX_PROMPT_LENGTH) {
        throw new Error(`Le message ne doit pas dépasser ${MAX_PROMPT_LENGTH} caractères.`);
      }

      try {
        checkRateLimit(`chatbot:${context?.ip ?? "unknown"}`, CHATBOT_RATE_LIMIT);
      } catch (error) {
        if (error instanceof RateLimitExceededError) return fallbackMessage(lang, "rate_limited");
        throw error;
      }

      const openai = getClient();
      if (!openai) {
        logger.error("Pemi AI : OPENAI_API_KEY absente.");
        return fallbackMessage(lang, "unavailable");
      }

      const config = chatbotConfig();
      const languageHint = `The website is currently displayed in ${LANGUAGE_NAMES[lang]}. Answer in the language of the user's message; if unclear, use ${LANGUAGE_NAMES[lang]}.`;
      const turns = [...cleanHistory(history), { role: "user" as const, content: text }];

      // 1) Modèle qui raisonne, avec recherche web.
      try {
        const response = await openai.responses.create({
          model: config.model,
          instructions: `${SYSTEM_PROMPT}\n\n${languageHint}`,
          input: turns,
          reasoning: { effort: config.effort },
          ...(config.webSearch ? { tools: [{ type: "web_search" as const }] } : {}),
          // Inclut les jetons de raisonnement : marge large.
          max_output_tokens: 4000,
        });
        const answer = toPlainText(response.output_text || "");
        if (answer) return answer;
        logger.error(`Pemi AI : réponse vide de ${config.model} (statut ${response.status}).`);
      } catch (error: any) {
        logger.error(`Pemi AI : échec de ${config.model} — ${error?.message ?? error}`);
      }

      // 2) Secours : appel simple, sans outils.
      try {
        const completion = await openai.chat.completions.create({
          model: config.fallbackModel,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "system", content: languageHint },
            ...turns,
          ],
          temperature: 0.4,
          max_tokens: 700,
        });
        const answer = toPlainText(completion.choices[0]?.message?.content || "");
        return answer || fallbackMessage(lang, "unavailable");
      } catch (error: any) {
        logger.error(`Pemi AI : échec du modèle de secours — ${error?.message ?? error}`);
        return fallbackMessage(lang, "unavailable");
      }
    },
  },
};
