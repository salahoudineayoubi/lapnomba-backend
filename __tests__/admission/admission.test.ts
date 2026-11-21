/**
 * Admissions v2 : code e-mail, test d'aptitude, numéros de pièce.
 * Les modèles Mongoose sont remplacés par une petite base en mémoire.
 */
const store: any[] = [];

jest.mock("../../src/models/applicationSession", () => {
  class FakeSession {
    [k: string]: any;
    constructor(data: any) {
      Object.assign(this, { codesSent: [], codeAttempts: 0, documents: {}, createdAt: new Date() }, data);
    }
    async save() {
      if (!store.includes(this)) store.push(this);
      return this;
    }
    markModified() {}
    static findOne(q: any) {
      const match = (s: any) =>
        Object.entries(q).every(([k, v]: any) =>
          v && typeof v === "object" && "$exists" in v ? (s[k] !== undefined) === v.$exists : s[k] === v
        );
      const found = [...store].reverse().find(match) || null;
      const p: any = Promise.resolve(found);
      p.sort = () => Promise.resolve(found);
      return p;
    }
  }
  return { ApplicationSession: FakeSession };
});
jest.mock("../../src/models/candidature", () => ({ __esModule: true, default: { exists: jest.fn().mockResolvedValue(null) } }));
jest.mock("../../src/utils/sendMail", () => ({ sendMail: jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/utils/privateFiles", () => ({
  uploadPrivateDataUri: jest.fn().mockResolvedValue("private:image:jpg:x"),
  deletePrivateFile: jest.fn().mockResolvedValue(undefined),
}));

import { sendMail } from "../../src/utils/sendMail";
import { requestApplicationCode, verifyApplicationCode, getSessionByToken } from "../../src/api/endpoints/admission/session";
import { startAptitudeTest, submitAptitudeAnswers } from "../../src/api/endpoints/admission/aptitude";
import { normalizeIdNumber } from "../../src/api/endpoints/admission/submit";
import { APTITUDE_QUESTION_BANK } from "../../src/scripts/aptitudeQuestionBank";

const mockedSend = sendMail as jest.Mock;
const lastCode = () => {
  const text = mockedSend.mock.calls[mockedSend.mock.calls.length - 1][0].text as string;
  return /(\d{6})/.exec(text)![1];
};

beforeEach(() => {
  store.length = 0;
  mockedSend.mockClear();
  delete process.env.TURNSTILE_SECRET_KEY;
});

describe("code de vérification e-mail", () => {
  it("refuse les adresses jetables", async () => {
    await expect(requestApplicationCode(null, { email: "x@yopmail.com" })).rejects.toThrow(/temporaires/);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("champ piège rempli : répond OK sans rien envoyer", async () => {
    await expect(requestApplicationCode(null, { email: "a@gmail.com", website: "spam" })).resolves.toBe(true);
    expect(mockedSend).not.toHaveBeenCalled();
    expect(store).toHaveLength(0);
  });

  it("envoie un code, le bon code donne un jeton de session, un mauvais code est refusé", async () => {
    await requestApplicationCode(null, { email: "Awa@Gmail.com" });
    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(mockedSend.mock.calls[0][0].to).toBe("awa@gmail.com");
    const code = lastCode();
    const wrong = code === "000000" ? "111111" : "000000";
    await expect(verifyApplicationCode(null, { email: "awa@gmail.com", code: wrong })).rejects.toThrow(/incorrect/);
    const token = await verifyApplicationCode(null, { email: "awa@gmail.com", code });
    expect(token.length).toBeGreaterThan(30);
    const s = await getSessionByToken(token);
    expect(s.email).toBe("awa@gmail.com");
    expect(s.verifiedAt).toBeInstanceOf(Date);
  });

  it("impose une minute entre deux envois", async () => {
    await requestApplicationCode(null, { email: "b@gmail.com" });
    await expect(requestApplicationCode(null, { email: "b@gmail.com" })).rejects.toThrow(/Patientez/);
  });
});

describe("test d'aptitude", () => {
  const newSession = async () => {
    await requestApplicationCode(null, { email: "c@gmail.com" });
    return verifyApplicationCode(null, { email: "c@gmail.com", code: lastCode() });
  };

  it("15 questions, sans les bonnes réponses, répartition par catégorie", async () => {
    const token = await newSession();
    const test = await startAptitudeTest(null, { token });
    expect(test.questions).toHaveLength(15);
    const cats = test.questions.reduce((m: any, q: any) => ({ ...m, [q.category]: (m[q.category] || 0) + 1 }), {});
    expect(cats).toEqual({ logique: 5, calcul: 4, comprehension: 3, numerique: 3 });
    expect(JSON.stringify(test)).not.toMatch(/answerIndex|explanation/);
    // reprise : même questions
    const again = await startAptitudeTest(null, { token });
    expect(again.questions.map((q: any) => q.prompt)).toEqual(test.questions.map((q: any) => q.prompt));
  });

  it("score calculé côté serveur malgré le mélange des réponses ; une seule tentative", async () => {
    const token = await newSession();
    const test = await startAptitudeTest(null, { token });
    const byPrompt = new Map(APTITUDE_QUESTION_BANK.map((q) => [q.prompt, q]));
    const answers = test.questions.map((q: any) => {
      const seed = byPrompt.get(q.prompt)!;
      return { questionId: q.id, choice: q.choices.indexOf(seed.choices[seed.answerIndex]) };
    });
    // 3 réponses fausses volontairement
    answers.slice(0, 3).forEach((a: any) => (a.choice = (a.choice + 1) % 4));
    await submitAptitudeAnswers(null, { token, answers: answers.slice(0, 8) });
    const res = await submitAptitudeAnswers(null, { token, answers: answers.slice(8), final: true });
    expect(res).toEqual({ finished: true, answered: 15, total: 15 });
    const s = await getSessionByToken(token);
    expect(s.aptitude!.score).toBe(12);
    await expect(startAptitudeTest(null, { token })).rejects.toThrow(/déjà passé/);
  });
});

describe("numéro de pièce", () => {
  it("CNI : ancien (9 chiffres) et nouveau (17 chiffres) formats, espaces tolérés", () => {
    expect(normalizeIdNumber("CNI", "100 758 507")).toBe("100758507");
    expect(normalizeIdNumber("CNI", "20170590799910554")).toBe("20170590799910554");
    expect(() => normalizeIdNumber("CNI", "12AB")).toThrow(/CNI invalide/);
  });
  it("passeport alphanumérique", () => {
    expect(normalizeIdNumber("PASSEPORT", "aa 123456")).toBe("AA123456");
    expect(() => normalizeIdNumber("PASSEPORT", "12")).toThrow(/passeport/);
  });
});
