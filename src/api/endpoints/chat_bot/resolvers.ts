import OpenAI from "openai";
import SYSTEM_PROMPT from "../../promt";
import { GraphQLContext } from "../../../utils/auth";
import { checkRateLimit, RateLimitExceededError } from "../../../utils/rateLimiter";
import logger from "../../../utils/logger";

// Chaque appel est facturé : limite par IP et taille maximale des messages.
const CHATBOT_RATE_LIMIT = { maxRequests: 20, windowMs: 10 * 60 * 1000 };
const MAX_PROMPT_LENGTH = 1000;
const MAX_HISTORY_TURNS = 8;
const DEFAULT_MODEL = "gpt-4o-mini";

let client: OpenAI | null | undefined;
const getClient = () => {
  if (client === undefined) {
    const apiKey = (process.env.OPENAI_API_KEY || "").trim();
    client = apiKey ? new OpenAI({ apiKey }) : null;
  }
  return client;
};

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

      try {
        const completion = await openai.chat.completions.create({
          model: (process.env.CHATBOT_MODEL || "").trim() || DEFAULT_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "system",
              content: `The website is currently displayed in ${LANGUAGE_NAMES[lang]}. Answer in the language of the user's message; if unclear, use ${LANGUAGE_NAMES[lang]}.`,
            },
            ...cleanHistory(history),
            { role: "user", content: text },
          ],
          temperature: 0.4,
          max_tokens: 600,
        });
        const answer = completion.choices[0]?.message?.content?.trim();
        return answer || fallbackMessage(lang, "unavailable");
      } catch (error: any) {
        logger.error(`Pemi AI : échec de l'appel OpenAI — ${error?.message ?? error}`);
        return fallbackMessage(lang, "unavailable");
      }
    },
  },
};
