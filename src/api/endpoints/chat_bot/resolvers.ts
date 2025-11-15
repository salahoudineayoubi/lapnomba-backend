import OpenAI from "openai";
import SYSTEM_PROMPT from "../../promt";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const chatbotResolvers = {
  Mutation: {
    chatbotPrompt: async (_: any, { prompt }: { prompt: string }) => {
      if (!prompt) {
        throw new Error("Le prompt est requis.");
      }
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        temperature: 0.3
      });
      return completion.choices[0]?.message?.content || "";
    },
  },
};