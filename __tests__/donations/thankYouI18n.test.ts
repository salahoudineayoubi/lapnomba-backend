import { buildThankYouEmail, normalizeDonorLanguage } from "../../src/api/endpoints/donateur/endpoints/financia/notifications/thankYou.i18n";
import { brandEmailHtml, LOGO_CID } from "../../src/utils/sendMail";

const base = { donorName: "Awa", amount: 5000, currency: "XAF" };

describe("e-mail de remerciement du donateur (langue)", () => {
  it("français par défaut (langue absente ou inconnue)", () => {
    expect(buildThankYouEmail(base).subject).toMatch(/^Merci/);
    expect(normalizeDonorLanguage("de")).toBe("fr");
    expect(normalizeDonorLanguage("en-US")).toBe("en");
  });
  it.each([
    ["en", /Thank you/, /Hello Awa/],
    ["tr", /teşekkür/, /Merhaba Awa/],
    ["ar", /شكرًا/, /مرحبًا Awa/],
  ])("%s : sujet et texte traduits", (language, subject, hello) => {
    const m = buildThankYouEmail({ ...base, language });
    expect(m.subject).toMatch(subject);
    expect(m.text).toMatch(hello);
    expect(m.text).not.toMatch(/Bonjour|Merci pour/);
  });
  it("arabe en RTL, montant isolé en LTR", () => {
    const m = buildThankYouEmail({ ...base, language: "ar" });
    expect(m.html).toContain('dir="rtl"');
    expect(m.html).toMatch(/<span dir="ltr">5\S*000 XAF<\/span>|<span dir="ltr">[^<]*XAF<\/span>/);
  });
  it("le nom du donateur est échappé", () => {
    expect(buildThankYouEmail({ ...base, donorName: "<b>x</b>", language: "en" }).html).not.toContain("<b>x</b>");
  });
});

describe("habillage des e-mails (logo)", () => {
  it("ajoute le logo en tête", () => {
    expect(brandEmailHtml("<p>Bonjour</p>")).toContain(`cid:${LOGO_CID}`);
  });
  it("ne touche pas un document HTML complet", () => {
    const doc = "<html><body>x</body></html>";
    expect(brandEmailHtml(doc)).toBe(doc);
  });
});
