import { chatbotResolvers, fallbackMessage } from "../../src/api/endpoints/chat_bot/resolvers";
import SYSTEM_PROMPT from "../../src/api/promt";

describe("Pemi AI", () => {
  const ask = (prompt: string, extra: Record<string, unknown> = {}, ip = "1.2.3.4") =>
    chatbotResolvers.Mutation.chatbotPrompt(null, { prompt, ...extra } as any, { ip } as any);

  it("répond par un message de secours (jamais vide) sans clé OpenAI", async () => {
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    jest.resetModules();
    const { chatbotResolvers: fresh } = require("../../src/api/endpoints/chat_bot/resolvers");
    const answer = await fresh.Mutation.chatbotPrompt(null, { prompt: "Bonjour", language: "en" }, { ip: "9.9.9.9" });
    expect(answer).toContain("https://wa.me/237657588317");
    expect(answer).toContain("I can't answer right now");
    process.env.OPENAI_API_KEY = saved;
  });

  it("refuse un message vide", async () => {
    await expect(ask("   ")).rejects.toThrow("Le message est requis.");
  });

  it("a un message de secours dans les 4 langues", () => {
    for (const lang of ["fr", "en", "tr", "ar"] as const) {
      expect(fallbackMessage(lang, "unavailable")).toContain("support@lapnomba.org");
      expect(fallbackMessage(lang, "rate_limited")).toContain("https://wa.me/237657588317");
    }
  });

  it("le prompt ne contient que des faits vérifiés (pas de chiffres d'impact inventés)", () => {
    expect(SYSTEM_PROMPT).not.toMatch(/500\+|95%|150\+|occult/i);
    expect(SYSTEM_PROMPT).toContain("100 000 FCFA");
    expect(SYSTEM_PROMPT).toContain("https://admissions.lapnomba.org");
  });
});
