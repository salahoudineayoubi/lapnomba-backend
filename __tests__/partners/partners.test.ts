jest.mock("../../src/models/partners", () => ({ __esModule: true, default: { create: jest.fn(async (d: any) => ({ id: "p1", ...d })) } }));
jest.mock("../../src/utils/sendMail", () => ({ sendMail: jest.fn(async () => undefined) }));

import { partnerResolvers } from "../../src/api/endpoints/partners/resolvers";

const valid = {
  nomOrganisation: "Association Exemple",
  nomFondateur: "Awa Diallo",
  emailCandidat: "awa@exemple.cm",
  emailOfficiel: "contact@exemple.cm",
  numeroContact: "+237690000000",
  posteCandidat: "Directrice",
  presentationOrganisation: "Nous accompagnons les jeunes de Yaoundé dans leurs projets numériques depuis 2020.",
  domaineAction: "Éducation numérique",
  adresse: "Bastos",
  ville: "Yaoundé",
  pays: "Cameroun",
  siteWeb: "www.exemple.cm",
  urlLinkedin: "",
};
const create = (input: any, ip: string) => partnerResolvers.Mutation.createPartner(null, { input }, { ip } as any);

describe("Demande de partenariat", () => {
  it("enregistre une demande valide (site web complété en https)", async () => {
    const p: any = await create(valid, "10.1.0.1");
    expect(p.siteWeb).toBe("https://www.exemple.cm");
    expect(p.urlLinkedin).toBeUndefined();
  });
  it("refuse un email invalide", async () => {
    await expect(create({ ...valid, emailOfficiel: "pas-un-email" }, "10.1.0.2")).rejects.toThrow("Adresse email invalide.");
  });
  it("refuse une présentation trop courte", async () => {
    await expect(create({ ...valid, presentationOrganisation: "Trop court" }, "10.1.0.3")).rejects.toThrow("au moins 30");
  });
  it("refuse une adresse de site invalide", async () => {
    await expect(create({ ...valid, siteWeb: "javascript:alert(1)" }, "10.1.0.4")).rejects.toThrow("adresse invalide");
  });
});
