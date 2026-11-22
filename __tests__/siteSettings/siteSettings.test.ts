/**
 * Paramètres du site — numéro WhatsApp support modifiable depuis l'admin.
 * Modèle Mongo mocké : aucune connexion réelle.
 */
const model = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
};
jest.mock("../../src/models/siteSettings", () => ({ SITE_SETTINGS_KEY: "global", SiteSettingsModel: model }));

import mongoose from "mongoose";
import {
  formatWhatsappDisplay,
  normalizeSupportWhatsapp,
  tryNormalizeSupportWhatsapp,
} from "../../src/utils/supportWhatsapp";
import {
  __resetSiteSettingsCacheForTests,
  getCachedSupportWhatsapp,
  refreshSiteSettingsCache,
  SITE_SETTINGS_TTL_MS,
} from "../../src/services/siteSettings";
import { buildSupportFooterText, getSupportContact } from "../../src/utils/emailSupport";
import { siteSettingsResolvers } from "../../src/api/endpoints/siteSettings/resolvers";
import { ADMIN_ONLY_OPERATIONS, applyAdminGuards } from "../../src/api/endpoints/accessControl";
import { buildSystemPrompt } from "../../src/api/promt";
import { fallbackMessage } from "../../src/api/endpoints/chat_bot/resolvers";

const adminCtx = { admin: { email: "admin@lapnomba.org", role: "admin" as const } };
const publicCtx = { admin: null };
const lean = (value: unknown) => ({ lean: async () => value });
const setReadyState = (state: number) =>
  Object.defineProperty(mongoose.connection, "readyState", { configurable: true, get: () => state });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  __resetSiteSettingsCacheForTests();
  delete process.env.SUPPORT_WHATSAPP;
  model.findOne.mockReturnValue(lean(null));
  model.findOneAndUpdate.mockImplementation((_q: any, update: any) =>
    lean({ key: "global", ...update.$set, updatedAt: new Date("2026-11-22T10:00:00Z") })
  );
  setReadyState(0);
});

describe("normalisation / formatage du numéro", () => {
  it("accepte les formats usuels et retourne les chiffres seuls", () => {
    expect(normalizeSupportWhatsapp("+237 657 588 317")).toBe("237657588317");
    expect(normalizeSupportWhatsapp(" 237-657-588-317 ")).toBe("237657588317");
    expect(normalizeSupportWhatsapp("(+237) 657.588.317")).toBe("237657588317");
    expect(normalizeSupportWhatsapp("00237657588317")).toBe("237657588317");
    expect(normalizeSupportWhatsapp("+33 6 12 34 56 78")).toBe("33612345678");
  });

  it("refuse les valeurs invalides", () => {
    expect(() => normalizeSupportWhatsapp("")).toThrow("requis");
    expect(() => normalizeSupportWhatsapp(undefined)).toThrow("requis");
    expect(() => normalizeSupportWhatsapp("+237 657 ABC 317")).toThrow("ne peut contenir");
    expect(() => normalizeSupportWhatsapp("1234567")).toThrow("entre 8 et 15");
    expect(() => normalizeSupportWhatsapp("+1234567890123456")).toThrow("entre 8 et 15");
    expect(() => normalizeSupportWhatsapp("237+657588317")).toThrow("début");
    expect(() => normalizeSupportWhatsapp("0657588317")).toThrow("international");
    expect(tryNormalizeSupportWhatsapp("abc")).toBeNull();
  });

  it("formate l'affichage par groupes de 3", () => {
    expect(formatWhatsappDisplay("237657588317")).toBe("+237 657 588 317");
    expect(formatWhatsappDisplay("33612345678")).toBe("+336 123 456 78");
  });
});

describe("getSupportContact — cache et valeurs de secours", () => {
  it("sans valeur en base : numéro par défaut", () => {
    const c = getSupportContact();
    expect(c.whatsappDigits).toBe("237657588317");
    expect(c.whatsappDisplay).toBe("+237 657 588 317");
    expect(c.whatsappLink).toBe("https://wa.me/237657588317");
  });

  it("sans valeur en base : SUPPORT_WHATSAPP (env) s'il est valide, sinon le défaut", () => {
    process.env.SUPPORT_WHATSAPP = "+237 699 000 111";
    expect(getSupportContact().whatsappDigits).toBe("237699000111");
    process.env.SUPPORT_WHATSAPP = "pas un numéro";
    expect(getSupportContact().whatsappDigits).toBe("237657588317");
  });

  it("utilise la valeur de la base une fois le cache chargé (prioritaire sur l'env)", async () => {
    process.env.SUPPORT_WHATSAPP = "+237699000111";
    model.findOne.mockReturnValue(lean({ supportWhatsapp: "237677112233", updatedAt: new Date() }));
    await refreshSiteSettingsCache();
    expect(getCachedSupportWhatsapp()).toBe("237677112233");
    expect(getSupportContact().whatsappDisplay).toBe("+237 677 112 233");
    expect(buildSupportFooterText()).toContain("+237 677 112 233");
    expect(buildSystemPrompt()).toContain("https://wa.me/237677112233 — numéro +237 677 112 233");
    expect(fallbackMessage("fr", "unavailable")).toContain("https://wa.me/237677112233");
  });

  it("base indisponible : jamais d'exception, dernière valeur connue conservée", async () => {
    model.findOne.mockReturnValue(lean({ supportWhatsapp: "237677112233" }));
    await refreshSiteSettingsCache();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    model.findOne.mockReturnValue({ lean: async () => Promise.reject(new Error("db down")) });
    await expect(refreshSiteSettingsCache()).resolves.toBeUndefined();
    expect(getSupportContact().whatsappDigits).toBe("237677112233");
    warn.mockRestore();
  });

  it("base indisponible dès le démarrage : valeur de secours", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    model.findOne.mockReturnValue({ lean: async () => Promise.reject(new Error("db down")) });
    await refreshSiteSettingsCache();
    expect(getSupportContact().whatsappDigits).toBe("237657588317");
    warn.mockRestore();
  });

  it("valeur invalide en base : ignorée", async () => {
    model.findOne.mockReturnValue(lean({ supportWhatsapp: "abc" }));
    await refreshSiteSettingsCache();
    expect(getSupportContact().whatsappDigits).toBe("237657588317");
  });

  it("ne lit jamais la base sans connexion Mongo ouverte", () => {
    getSupportContact();
    expect(model.findOne).not.toHaveBeenCalled();
  });

  it("rafraîchit en arrière-plan quand le cache est périmé et la base connectée", async () => {
    setReadyState(1);
    await refreshSiteSettingsCache();
    expect(model.findOne).toHaveBeenCalledTimes(1);
    getSupportContact(); // cache frais : pas de nouvelle lecture
    expect(model.findOne).toHaveBeenCalledTimes(1);

    const now = Date.now();
    const spy = jest.spyOn(Date, "now").mockReturnValue(now + SITE_SETTINGS_TTL_MS + 1);
    model.findOne.mockReturnValue(lean({ supportWhatsapp: "237677112233" }));
    expect(getSupportContact().whatsappDigits).toBe("237657588317"); // synchrone : ancienne valeur
    await new Promise((r) => setImmediate(r));
    expect(model.findOne).toHaveBeenCalledTimes(2);
    expect(getSupportContact().whatsappDigits).toBe("237677112233");
    spy.mockRestore();
  });
});

describe("GraphQL siteSettings / updateSiteSettings", () => {
  // Les autres opérations admin sont simulées : applyAdminGuards exige qu'elles existent toutes.
  const stubs: Record<"Query" | "Mutation", Record<string, () => string>> = { Query: {}, Mutation: {} };
  for (const type of ["Query", "Mutation"] as const) {
    for (const name of ADMIN_ONLY_OPERATIONS[type]) {
      if (!(name in (siteSettingsResolvers as any)[type])) stubs[type][name] = () => "ok";
    }
  }
  const [guarded] = applyAdminGuards([siteSettingsResolvers, stubs]);

  it("updateSiteSettings est réservé à l'admin", async () => {
    expect(ADMIN_ONLY_OPERATIONS.Mutation).toContain("updateSiteSettings");
    expect(() => guarded.Mutation.updateSiteSettings(null, { input: { supportWhatsapp: "+237 677 112 233" } }, publicCtx, null)).toThrow(
      "Authentification admin requise."
    );
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("la lecture siteSettings reste publique et masque updatedBy", async () => {
    const r = await guarded.Query.siteSettings(null, {}, publicCtx, null);
    expect(r).toMatchObject({
      supportWhatsappDigits: "237657588317",
      supportWhatsappDisplay: "+237 657 588 317",
      supportWhatsappLink: "https://wa.me/237657588317",
      supportEmail: expect.stringContaining("@"),
      isCustomized: false,
      updatedBy: null,
    });
  });

  it("admin : normalise, enregistre et met le cache à jour immédiatement", async () => {
    const r = await guarded.Mutation.updateSiteSettings(null, { input: { supportWhatsapp: "+237 677-112-233" } }, adminCtx, null);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { key: "global" },
      { $set: { supportWhatsapp: "237677112233", updatedBy: "admin@lapnomba.org" } },
      expect.objectContaining({ upsert: true })
    );
    expect(r).toMatchObject({
      supportWhatsappDigits: "237677112233",
      supportWhatsappDisplay: "+237 677 112 233",
      supportWhatsappLink: "https://wa.me/237677112233",
      isCustomized: true,
      updatedBy: "admin@lapnomba.org",
      updatedAt: "2026-11-22T10:00:00.000Z",
    });
    expect(getSupportContact().whatsappDigits).toBe("237677112233");
    const pub = await guarded.Query.siteSettings(null, {}, publicCtx, null);
    expect(pub.supportWhatsappDigits).toBe("237677112233");
    expect(pub.updatedBy).toBeNull();
  });

  it("admin : valeur invalide refusée (UserInputError), rien n'est enregistré", async () => {
    await expect(
      guarded.Mutation.updateSiteSettings(null, { input: { supportWhatsapp: "appelez-nous" } }, adminCtx, null)
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    expect(getSupportContact().whatsappDigits).toBe("237657588317");
  });
});
