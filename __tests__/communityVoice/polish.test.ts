jest.mock("../../src/utils/sendMail", () => ({ sendMail: jest.fn() }));

import { buildPolishMessages, isAcceptablePolish, parsePolishResponse, polishVoiceText } from "../../src/services/voicePolish";

describe("reformulation IA des avis", () => {
  it("lit la réponse JSON", () => {
    expect(parsePolishResponse('{"text":" Bonjour, merci. "}')).toBe("Bonjour, merci.");
    expect(parsePolishResponse("pas du json")).toBeNull();
    expect(parsePolishResponse('{"text":""}')).toBeNull();
  });

  it("refuse une réponse qui perd des nombres ou change trop la longueur", () => {
    const src = "jai suivi la formation pendant 3 mois a yaounde et sa ma beaucoup aider pour trouver un travail";
    expect(isAcceptablePolish(src, "J'ai suivi la formation pendant 3 mois à Yaoundé et cela m'a beaucoup aidé à trouver un travail.")).toBe(true);
    expect(isAcceptablePolish(src, "J'ai suivi la formation à Yaoundé et cela m'a beaucoup aidé à trouver un travail.")).toBe(false);
    expect(isAcceptablePolish(src, "Super.")).toBe(false);
  });

  it("consigne : même langue, sens et critiques conservés, Zaguina intact", () => {
    const sys = buildPolishMessages("x")[0].content;
    expect(sys).toMatch(/SAME language/);
    expect(sys).toMatch(/Do not remove criticism/);
    expect(sys).toMatch(/Zaguina/);
  });

  it("appelle le modèle et renvoie la version corrigée", async () => {
    const create = jest.fn().mockResolvedValue({ choices: [{ message: { content: '{"text":"Merci pour la formation, elle m\'a beaucoup aidé."}' } }] });
    const out = await polishVoiceText({ chat: { completions: { create } } }, "merci pr la formation elle ma bcp aider");
    expect(out).toBe("Merci pour la formation, elle m'a beaucoup aidé.");
    expect(create.mock.calls[0][0].response_format).toEqual({ type: "json_object" });
  });

  it("signale une réponse non fiable", async () => {
    const create = jest.fn().mockResolvedValue({ choices: [{ message: { content: "{}" } }] });
    await expect(polishVoiceText({ chat: { completions: { create } } }, "texte")).rejects.toThrow(/pas fiable/);
  });
});
