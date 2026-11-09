import { mergeTranslations, translateShortTexts, hasAllLanguages } from "../../src/services/textTranslation";

const fakeClient = (byLang: Record<string, any>) => ({
  chat: {
    completions: {
      create: async ({ messages }: any) => {
        const lang = ["French", "English", "Turkish", "Arabic"].find((l) => messages[0].content.includes(`into ${l}`))!;
        return { choices: [{ message: { content: JSON.stringify(byLang[lang]) } }] };
      },
    },
  },
});

describe("translateShortTexts", () => {
  it("traduit chaque champ et garde le texte exact dans la langue d'origine", async () => {
    const source = "Merci Lap Nomba, 3 mois de formation.";
    const client = fakeClient({
      French: { sourceLanguage: "fr", comment: "Merci Lap Nomba, 3 mois de formation !" },
      English: { sourceLanguage: "fr", comment: "Thank you Lap Nomba, 3 months of training." },
      Turkish: { sourceLanguage: "fr", comment: "Teşekkürler Lap Nomba, 3 aylık eğitim." },
      Arabic: { sourceLanguage: "fr", comment: "شكراً Lap Nomba، 3 أشهر من التدريب." },
    });
    const r = await translateShortTexts(client, "review", { comment: source });
    expect(r.sourceLanguage).toBe("fr");
    expect(r.i18n.comment.fr).toBe(source);
    expect(r.i18n.comment.en).toBe("Thank you Lap Nomba, 3 months of training.");
    expect(hasAllLanguages(r.i18n.comment)).toBe(true);
  });

  it("rejette une traduction qui perd un terme protégé ou un nombre", async () => {
    const client = fakeClient({
      French: { sourceLanguage: "fr", comment: "Merci Lap Nomba, 3 mois." },
      English: { sourceLanguage: "fr", comment: "Thanks, three months." },
      Turkish: { sourceLanguage: "fr", comment: "Teşekkürler Lap Nomba, 3 ay." },
      Arabic: { sourceLanguage: "fr", comment: "شكراً Lap Nomba، 3 أشهر." },
    });
    const r = await translateShortTexts(client, "review", { comment: "Merci Lap Nomba, 3 mois." });
    expect(r.i18n.comment.en).toBeUndefined();
    expect(r.failures.join()).toContain("en");
  });
});

describe("mergeTranslations", () => {
  it("ne remplace jamais une traduction existante (corrigée dans l'admin)", () => {
    expect(mergeTranslations({ en: "Edited" }, { en: "AI", tr: "AI-tr" })).toEqual({ en: "Edited", tr: "AI-tr" });
  });
  it("remplace tout en mode overwrite", () => {
    expect(mergeTranslations({ en: "Old" }, { en: "New" }, true)).toEqual({ en: "New" });
  });
});
