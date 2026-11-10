const find = jest.fn();
jest.mock("../../src/models/talent_profile", () => {
  const actual = jest.requireActual("../../src/models/talent_profile");
  const chain = { sort: () => chain, limit: (n: number) => (find.mock.calls.push([n]), Promise.resolve([])) };
  return {
    ...actual,
    TalentProfileModel: {
      find: (q: any) => ((find as any).lastQuery = q, chain),
      findOne: jest.fn(async (q: any) => q),
      exists: jest.fn(async () => null),
      create: jest.fn(async (doc: any) => ({ _id: "p1", ...doc })),
    },
  };
});
jest.mock("../../src/services/textTranslation", () => ({
  ...jest.requireActual("../../src/services/textTranslation"),
  runTranslationInBackground: jest.fn(),
}));

import { slugify, talentProfileResolvers } from "../../src/api/endpoints/talentProfile/resolvers";
import { privacyFieldResolvers } from "../../src/api/endpoints/accessControl";

describe("Profils de talents", () => {
  it("le site ne voit que les profils publiés AVEC consentement", async () => {
    await talentProfileResolvers.Query.talentProfiles(null, { expertise: "data_ai", seniority: "hack" });
    expect((find as any).lastQuery).toEqual({ published: true, consentObtained: true, expertise: "data_ai" });
    const one: any = await talentProfileResolvers.Query.talentProfile(null, { slug: " Moussa-K " });
    expect(one).toEqual({ slug: "moussa-k", published: true, consentObtained: true });
  });

  it("refuse de publier sans consentement", async () => {
    await expect(
      talentProfileResolvers.Mutation.createTalentProfile(null, {
        input: { displayName: "Moussa K.", headline: "Développeur React", expertise: "web_mobile", published: true },
      })
    ).rejects.toThrow("Publication impossible sans le consentement");
  });

  it("crée un profil avec un slug lisible", async () => {
    const p: any = await talentProfileResolvers.Mutation.createTalentProfile(null, {
      input: { displayName: "Aïcha N.", headline: "Data analyst", expertise: "data_ai", skills: ["SQL", "SQL", "Power BI"], consentObtained: true, published: true },
    });
    expect(p.slug).toBe("aicha-n");
    expect(p.skills).toEqual(["SQL", "Power BI"]);
  });

  it("refuse un lien non https", async () => {
    await expect(
      talentProfileResolvers.Mutation.createTalentProfile(null, {
        input: { displayName: "A B.", headline: "Dev", expertise: "web_mobile", githubUrl: "javascript:alert(1)" },
      })
    ).rejects.toThrow("https://");
  });

  it("coordonnées et notes cachées au public, visibles par l'admin", () => {
    const r: any = (privacyFieldResolvers as any).TalentProfile;
    const p = { email: "a@b.c", phone: "+237", notes: "x", githubUrl: "https://github.com/a", fullName: "Aïcha N." };
    const pub = { admin: null } as any;
    const admin = { admin: { id: "1" } } as any;
    expect(r.email(p, {}, pub)).toBeNull();
    expect(r.githubUrl(p, {}, pub)).toBeNull();
    expect(r.fullName(p, {}, pub)).toBeNull();
    expect(r.email(p, {}, admin)).toBe("a@b.c");
  });

  it("slugify", () => {
    expect(slugify("Jean-Pierre Ndongo É.")).toBe("jean-pierre-ndongo-e");
  });
});
