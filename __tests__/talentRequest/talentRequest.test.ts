jest.mock("../../src/models/talent_request", () => {
  const actual = jest.requireActual("../../src/models/talent_request");
  return { ...actual, TalentRequestModel: { create: jest.fn(async (doc: any) => ({ _id: "abc123", ...doc })) } };
});
jest.mock("../../src/utils/sendMail", () => ({ sendMail: jest.fn(async () => undefined) }));

import { talentRequestResolvers } from "../../src/api/endpoints/talentRequest/resolvers";
import { TalentRequestModel } from "../../src/models/talent_request";

const create = (input: any, ip = "10.0.0.1") =>
  talentRequestResolvers.Mutation.createTalentRequest(null, { input }, { ip } as any);

describe("Demande de talents (lapnomba.com)", () => {
  const valid = { companyName: "Acme", contactName: "Awa Diallo", email: "awa@acme.com", roles: ["web_mobile", "data_ai"], language: "en" };

  it("enregistre une demande valide et ignore les profils inconnus", async () => {
    const res = await create({ ...valid, roles: ["web_mobile", "hacker", "web_mobile"], teamSize: 3, engagement: "full_time" }, "10.0.0.2");
    expect(res).toEqual({ success: true, message: "Demande enregistrée.", id: "abc123" });
    const doc = (TalentRequestModel.create as jest.Mock).mock.calls[0][0];
    expect(doc.roles).toEqual(["web_mobile"]);
    expect(doc.teamSize).toBe(3);
    expect(doc.engagement).toBe("full_time");
  });

  it("exige au moins un profil", async () => {
    await expect(create({ ...valid, roles: ["nope"] }, "10.0.0.3")).rejects.toThrow("Choisissez au moins un profil recherché.");
  });

  it("refuse une taille d'équipe invalide", async () => {
    await expect(create({ ...valid, teamSize: 0 }, "10.0.0.4")).rejects.toThrow("Taille d'équipe invalide.");
  });

  it("limite les envois répétés (5 par heure et par IP)", async () => {
    for (let i = 0; i < 5; i++) await create(valid, "10.0.0.9");
    await expect(create(valid, "10.0.0.9")).rejects.toThrow();
  });
});
