import OpenAI from "openai";
import SYSTEM_PROMPT from "../../promt";
import { GraphQLContext } from "../../../utils/auth";
import { checkRateLimit } from "../../../utils/rateLimiter";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Chaque appel est facturé : limite par IP et taille maximale du message.
const CHATBOT_RATE_LIMIT = { maxRequests: 20, windowMs: 10 * 60 * 1000 };
const MAX_PROMPT_LENGTH = 1000;

export const chatbotResolvers = {
  Mutation: {
    chatbotPrompt: async (_: any, { prompt }: { prompt: string }, context: GraphQLContext) => {
      const text = (prompt || "").trim();

      if (!text) {
        throw new Error("Le message est requis.");
      }
      if (text.length > MAX_PROMPT_LENGTH) {
        throw new Error(`Le message ne doit pas dépasser ${MAX_PROMPT_LENGTH} caractères.`);
      }

      checkRateLimit(`chatbot:${context?.ip ?? "unknown"}`, CHATBOT_RATE_LIMIT);

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });
      return completion.choices[0]?.message?.content || "";
    },
  },
};
