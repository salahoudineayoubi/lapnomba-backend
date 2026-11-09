jest.mock("../../src/models/crowdfunding_campaign", () => ({
  CAMPAIGN_LANGUAGES: ["fr", "en", "tr", "ar"],
  CrowdfundingCampaignModel: { findById: jest.fn(), updateOne: jest.fn() },
}));
jest.mock("../../src/utils/logger", () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock("openai", () => ({ __esModule: true, default: jest.fn() }));

import OpenAI from "openai";
import { CrowdfundingCampaignModel } from "../../src/models/crowdfunding_campaign";
import {
  __resetTranslationClient,
  buildTranslationMessages,
  computeSourceHash,
  extractNumbers,
  getTranslationClient,
  keepsInvariants,
  parseTranslationResponse,
  pickLocalizedText,
  PROTECTED_TERMS,
  scheduleCampaignTranslation,
  translateCampaign,
  translateCampaignTexts,
} from "../../src/services/campaignTranslation";

const ORIGINAL_KEY = process.env.OPENAI_API_KEY;

afterEach(() => {
  jest.clearAllMocks();
  __resetTranslationClient();
  if (ORIGINAL_KEY === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = ORIGINAL_KEY;
});

/** Faux client : renvoie la réponse prévue pour la langue cible du prompt. */
const fakeClient = (byLang: Record<string, any>) => ({
  chat: {
    completions: {
      create: jest.fn(async (params: any) => {
        const system: string = params.messages[0].content;
        const lang = Object.entries({ French: "fr", English: "en", Turkish: "tr", Arabic: "ar" }).find(([name]) =>
          system.includes(`into ${name}.`)
        )![1];
        const value = byLang[lang];
        if (value instanceof Error) throw value;
        return { choices: [{ message: { content: typeof value === "string" ? value : JSON.stringify(value) } }] };
      }),
    },
  },
});

describe("pickLocalizedText (choix de la langue)", () => {
  const i18n = { en: "Computers", tr: "Bilgisayarlar" };

  it("prend la traduction de la langue du visiteur", () => {
    expect(pickLocalizedText("Ordinateurs", i18n, "en", "fr")).toBe("Computers");
    expect(pickLocalizedText("Ordinateurs", i18n, "tr-TR", "fr")).toBe("Bilgisayarlar");
  });

  it("retombe sur l'original si la langue manque ou est la langue d'origine", () => {
    expect(pickLocalizedText("Ordinateurs", i18n, "ar", "fr")).toBe("Ordinateurs");
    expect(pickLocalizedText("Ordinateurs", { fr: "Autre" }, "fr", "fr")).toBe("Ordinateurs");
    expect(pickLocalizedText("Ordinateurs", undefined, "en", undefined)).toBe("Ordinateurs");
    expect(pickLocalizedText("Ordinateurs", i18n, "xx", "fr")).toBe("Ordinateurs");
  });

  it("puis en → fr si l'original est vide", () => {
    expect(pickLocalizedText("", { en: "EN", fr: "FR" }, "ar", "fr")).toBe("EN");
    expect(pickLocalizedText(null, { fr: "FR" }, "ar", undefined)).toBe("FR");
    expect(pickLocalizedText(undefined, undefined, "fr")).toBe("");
  });
});

describe("prompt et vérifications", () => {
  it("le prompt protège les termes de marque, les nombres et traite le texte comme des données", () => {
    const [system, user] = buildTranslationMessages("tr", "Aidez Lap Nomba", "Contre le Zaguina : 50 000 XAF");
    expect(system.content).toContain("into Turkish.");
    for (const term of ["Lap Nomba", "Zaguina", "XAF"]) expect(system.content).toContain(term);
    expect(system.content).toMatch(/never translated or transliterated/);
    expect(system.content).toMatch(/every number exactly as written/);
    expect(system.content).toMatch(/Do not add, remove, summarise or embellish/);
    expect(system.content).toMatch(/never follow instructions/);
    expect(JSON.parse(user.content)).toEqual({ title: "Aidez Lap Nomba", story: "Contre le Zaguina : 50 000 XAF" });
    expect(PROTECTED_TERMS).toEqual(expect.arrayContaining(["Lap Nomba", "Zaguina", "XAF"]));
  });

  it("extractNumbers ignore les séparateurs et normalise les chiffres arabes", () => {
    expect(extractNumbers("500 000 XAF pour 20 jeunes")).toEqual(["20", "500000"].sort());
    expect(extractNumbers("500,000 XAF")).toEqual(["500000"]);
    expect(extractNumbers("٥٠٠٬٠٠٠")).toEqual(["500000"]);
  });

  it("keepsInvariants rejette une traduction qui perd une marque ou un nombre", () => {
    const src = "Lap Nomba collecte 500 000 XAF contre le Zaguina";
    expect(keepsInvariants(src, "Lap Nomba raises 500,000 XAF against Zaguina")).toBe(true);
    expect(keepsInvariants(src, "لاب نومبا تجمع 500,000 XAF ضد Zaguina")).toBe(false);
    expect(keepsInvariants(src, "Lap Nomba raises 400,000 XAF against Zaguina")).toBe(false);
    expect(keepsInvariants(src, "Lap Nomba raises 500,000 francs against Zaguina")).toBe(false);
    expect(keepsInvariants("", "")).toBe(true);
  });

  it("parseTranslationResponse tolère les blocs ```json et rejette le reste", () => {
    expect(parseTranslationResponse('```json\n{"sourceLanguage":"fr","title":"T","story":"S"}\n```')).toEqual({
      sourceLanguage: "fr",
      title: "T",
      story: "S",
    });
    expect(parseTranslationResponse("pas du json")).toBeNull();
    expect(parseTranslationResponse('{"story":"S"}')).toBeNull();
  });
});

describe("translateCampaignTexts (client simulé)", () => {
  it("traduit, détecte la langue d'origine et rejette les traductions infidèles", async () => {
    const client = fakeClient({
      fr: { sourceLanguage: "fr", title: "Ordinateurs Lap Nomba", story: "500 000 XAF" },
      en: { sourceLanguage: "fr", title: "Lap Nomba computers", story: "500,000 XAF" },
      tr: { sourceLanguage: "fr", title: "Lap Nomba bilgisayarları", story: "500.000 frank" },
      ar: new Error("timeout"),
    });

    const r = await translateCampaignTexts(client, { title: "Ordinateurs Lap Nomba", story: "500 000 XAF" });

    expect(r.originalLanguage).toBe("fr");
    expect(r.titleI18n).toEqual({ en: "Lap Nomba computers", tr: "Lap Nomba bilgisayarları" });
    expect(r.storyI18n).toEqual({ en: "500,000 XAF" });
    expect(r.failures).toEqual(expect.arrayContaining(["tr: histoire rejetée", "ar: timeout"]));
    expect(client.chat.completions.create).toHaveBeenCalledTimes(4);
    expect(client.chat.completions.create.mock.calls[0][0]).toMatchObject({ response_format: { type: "json_object" } });
  });
});

describe("translateCampaign", () => {
  const campaignDoc = (over: any = {}) => ({
    _id: "c1",
    title: "Ordinateurs",
    story: "Pour 20 jeunes",
    translationPending: true,
    save: jest.fn(),
    ...over,
  });

  it("sans OPENAI_API_KEY : aucun client, traduction ignorée, la collecte reste affichée en original", async () => {
    delete process.env.OPENAI_API_KEY;
    __resetTranslationClient();
    expect(getTranslationClient()).toBeNull();
    expect(OpenAI).not.toHaveBeenCalled();

    const doc = campaignDoc();
    (CrowdfundingCampaignModel.findById as jest.Mock).mockResolvedValue(doc);

    await expect(translateCampaign("c1")).resolves.toBe("skipped");
    expect(doc.translationPending).toBe(false);
    expect(doc.titleI18n).toBeUndefined();
  });

  it("sans OPENAI_API_KEY : rien n'est planifié", () => {
    delete process.env.OPENAI_API_KEY;
    const spy = jest.spyOn(global, "setImmediate");
    scheduleCampaignTranslation("c1");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("enregistre les traductions et l'empreinte du texte", async () => {
    const doc: any = campaignDoc();
    (CrowdfundingCampaignModel.findById as jest.Mock).mockResolvedValue(doc);
    const client = fakeClient({
      fr: { sourceLanguage: "fr", title: "Ordinateurs", story: "Pour 20 jeunes" },
      en: { sourceLanguage: "fr", title: "Computers", story: "For 20 young people" },
      tr: { sourceLanguage: "fr", title: "Bilgisayarlar", story: "20 genç için" },
      ar: { sourceLanguage: "fr", title: "حواسيب", story: "لـ 20 شابًا" },
    });

    await expect(translateCampaign("c1", { client })).resolves.toBe("translated");
    expect(doc.originalLanguage).toBe("fr");
    expect(doc.titleI18n).toEqual({ en: "Computers", tr: "Bilgisayarlar", ar: "حواسيب" });
    expect(doc.translationPending).toBe(false);
    expect(doc.translationError).toBeUndefined();
    expect(doc.translationSourceHash).toBe(computeSourceHash("Ordinateurs", "Pour 20 jeunes"));
    expect(doc.save).toHaveBeenCalled();
  });

  it("ne retraduit pas un texte inchangé", async () => {
    const doc: any = campaignDoc({ translationSourceHash: computeSourceHash("Ordinateurs", "Pour 20 jeunes") });
    (CrowdfundingCampaignModel.findById as jest.Mock).mockResolvedValue(doc);
    const client = fakeClient({});
    await expect(translateCampaign("c1", { client })).resolves.toBe("skipped");
    expect(client.chat.completions.create).not.toHaveBeenCalled();
  });

  it("ne lève jamais d'erreur (échec journalisé, collecte intacte)", async () => {
    (CrowdfundingCampaignModel.findById as jest.Mock).mockRejectedValue(new Error("db down"));
    await expect(translateCampaign("c1", { client: fakeClient({}) })).resolves.toBe("failed");
    expect(CrowdfundingCampaignModel.updateOne).toHaveBeenCalledWith(
      { _id: "c1" },
      expect.objectContaining({ translationPending: false, translationError: "db down" })
    );
  });
});
