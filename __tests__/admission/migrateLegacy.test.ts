jest.mock("../../src/data-source", () => ({ connectMongo: jest.fn() }));
jest.mock("../../src/utils/sendMail", () => ({ sendMail: jest.fn() }));
jest.mock("../../src/utils/privateFiles", () => ({}));

import {
  parseLegacyBirthDate,
  groupForAge,
  draftFromLegacy,
  youthEmail,
  academyEmail,
} from "../../src/scripts/migrateLegacyCandidatures";

describe("bascule des anciennes candidatures", () => {
  it("lit les formats de date des anciens formulaires", () => {
    expect(parseLegacyBirthDate("2004-03-09")?.toISOString().slice(0, 10)).toBe("2004-03-09");
    expect(parseLegacyBirthDate("09/03/2004")?.toISOString().slice(0, 10)).toBe("2004-03-09");
    expect(parseLegacyBirthDate("9-3-2004")?.toISOString().slice(0, 10)).toBe("2004-03-09");
    expect(parseLegacyBirthDate("31/02/2004")).toBeNull();
    expect(parseLegacyBirthDate("n'importe quoi")).toBeNull();
    expect(parseLegacyBirthDate(undefined)).toBeNull();
  });

  it("répartit par âge : 16-25 / plus de 25 / moins de 16 / inconnu", () => {
    expect(groupForAge(16)).toBe("youth");
    expect(groupForAge(25)).toBe("youth");
    expect(groupForAge(26)).toBe("academy");
    expect(groupForAge(15)).toBe("too_young");
    expect(groupForAge(null)).toBe("youth");
  });

  it("pré-remplit le brouillon v2 sans valeurs invalides", () => {
    const d = JSON.parse(
      draftFromLegacy(
        { nomComplet: " Awa Ngono ", sexe: "Femme", pays: "Cameroun", ville: "Yaoundé", numeroWhatsapp: "+237 6", niveauScolaire: "Bac", ecole: "" },
        parseLegacyBirthDate("01/02/2005")
      )
    );
    expect(d.step).toBe(1);
    expect(d.form).toEqual({ nomComplet: "Awa Ngono", dateNaissance: "2005-02-01", sexe: "Femme", ville: "Yaoundé", numeroWhatsapp: "+237 6", niveauScolaire: "Bac" });
  });

  it("e-mails : lien de reprise avec l'adresse, lien Academy, contenu échappé", () => {
    const y = youthEmail("a+b@x.cm", "<b>Jean</b> Paul");
    expect(y.html).toContain("/register?email=a%2Bb%40x.cm");
    expect(y.html).not.toContain("<b>Jean</b>");
    expect(y.text).toContain("16 à 25 ans");
    const a = academyEmail("Marie Claire");
    expect(a.html).toContain("https://academy.lapnomba.org");
    expect(a.text).toContain("Bonjour Claire,");
  });
});
