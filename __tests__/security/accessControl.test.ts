import { applyAdminGuards, ADMIN_ONLY_OPERATIONS, maskEmail, maskPhone, privacyFieldResolvers } from "../../src/api/endpoints/accessControl";

const adminCtx = { admin: { email: "admin@lapnomba.org", role: "admin" as const } };
const publicCtx = { admin: null };

const buildMaps = () => {
  const query: Record<string, any> = {};
  const mutation: Record<string, any> = {};
  ADMIN_ONLY_OPERATIONS.Query.forEach((n) => (query[n] = () => "ok"));
  ADMIN_ONLY_OPERATIONS.Mutation.forEach((n) => (mutation[n] = () => "ok"));
  query.testimonials = () => "public";
  return [{ Query: query, Mutation: mutation }];
};

describe("accessControl", () => {
  it("refuse les opérations admin sans token", () => {
    const [guarded] = applyAdminGuards(buildMaps());
    expect(() => guarded.Query.donations(null, {}, publicCtx, null)).toThrow("Authentification admin requise.");
    expect(() => guarded.Mutation.deleteDonation(null, {}, publicCtx, null)).toThrow();
    expect(() => guarded.Query.psychosocials(null, {}, publicCtx, null)).toThrow();
  });

  it("autorise les opérations admin avec token", () => {
    const [guarded] = applyAdminGuards(buildMaps());
    expect(guarded.Query.donations(null, {}, adminCtx, null)).toBe("ok");
  });

  it("laisse les opérations publiques accessibles", () => {
    const [guarded] = applyAdminGuards(buildMaps());
    expect(guarded.Query.testimonials(null, {}, publicCtx, null)).toBe("public");
  });

  it("échoue au démarrage si une opération admin listée n'existe pas", () => {
    expect(() => applyAdminGuards([{ Query: { donations: () => "ok" } }])).toThrow(/introuvables/);
  });

  it("masque les coordonnées des donateurs pour le public", () => {
    const donation = { donorEmail: "awa.ngo@gmail.com", donorPhone: "677123456", bankTransfer: { reference: "X" } };
    const r = privacyFieldResolvers.Donation;
    expect(r.donorEmail(donation, {}, publicCtx)).toBe("a***@gmail.com");
    expect(r.donorPhone(donation, {}, publicCtx)).toBe("*******56");
    expect(r.bankTransfer(donation, {}, publicCtx)).toBeNull();
    expect(r.donorEmail(donation, {}, adminCtx)).toBe("awa.ngo@gmail.com");
  });

  it("maskEmail / maskPhone gèrent les valeurs vides", () => {
    expect(maskEmail(undefined)).toBe("");
    expect(maskPhone(null)).toBeNull();
  });
});
