const model = {
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  exists: jest.fn(),
  create: jest.fn(),
  bulkWrite: jest.fn(),
};
jest.mock("../../src/models/leader", () => ({ LeaderModel: model }));

const uploadFromBase64 = jest.fn();
const deleteImage = jest.fn();
jest.mock("../../src/utils/cloudinary", () => ({ uploadFromBase64, deleteImage }));

import fs from "fs";
import os from "os";
import path from "path";
import { leaderResolvers } from "../../src/api/endpoints/leaders/resolvers";
import {
  findFreeSlug,
  slugify,
  validateLocalized,
  validateName,
  validateOrder,
  validateReorderIds,
  validateSlug,
} from "../../src/api/endpoints/leaders/validation";
import { ADMIN_ONLY_OPERATIONS, applyAdminGuards } from "../../src/api/endpoints/accessControl";
import { buildLeaderSeeds, LEADER_SEED_SOURCES, seedLeaders } from "../../src/scripts/seedLeaders";

const ID = "64b7f0c2a1b2c3d4e5f60718";
const ID2 = "64b7f0c2a1b2c3d4e5f60719";
const PNG = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]).toString("base64")}`;
const PDF = `data:image/png;base64,${Buffer.from("%PDF-1.4 fake").toString("base64")}`;

/** Chaîne mongoose minimale : .sort().select().lean() */
const chain = (value: unknown) => {
  const c: any = { sort: () => c, select: () => c, lean: async () => value };
  return c;
};

beforeEach(() => {
  jest.clearAllMocks();
  model.exists.mockResolvedValue(null);
  model.findOne.mockReturnValue(chain(null));
  model.find.mockReturnValue(chain([]));
  model.create.mockImplementation(async (doc: any) => ({ _id: ID, ...doc }));
  uploadFromBase64.mockResolvedValue({ secure_url: "https://res.cloudinary.com/demo/image/upload/v1/leaders/x.webp", public_id: "leaders/x" });
  deleteImage.mockResolvedValue(undefined);
});

describe("validation des leaders", () => {
  it("slugify retire accents et caractères spéciaux", () => {
    expect(slugify("Diemsa Fatima Amira")).toBe("diemsa-fatima-amira");
    expect(slugify("  Élodie N'Goh — Présidente ")).toBe("elodie-n-goh-presidente");
    expect(slugify("عبد")).toBe("");
  });

  it("validateSlug accepte minuscules/chiffres/tirets et refuse le reste", () => {
    expect(validateSlug(" Abdel-Naser ")).toBe("abdel-naser");
    expect(() => validateSlug("abdel naser")).toThrow("Slug invalide");
    expect(() => validateSlug("-abdel")).toThrow("Slug invalide");
    expect(() => validateSlug("abdel--naser")).toThrow("Slug invalide");
    expect(() => validateSlug("élodie")).toThrow("Slug invalide");
    expect(() => validateSlug("")).toThrow("requis");
    expect(() => validateSlug("a".repeat(81))).toThrow("80");
  });

  it("validateName exige un nom", () => {
    expect(validateName("  Cabrel   Domfang ")).toBe("Cabrel Domfang");
    expect(() => validateName("   ")).toThrow("Le nom est requis");
    expect(() => validateName("x".repeat(121))).toThrow("120");
  });

  it("validateLocalized garde les langues remplies, exige fr si demandé, limite la longueur", () => {
    expect(validateLocalized({ fr: " Président ", en: "", tr: "  ", ar: "رئيس" }, { label: "Le titre", max: 200, requireFr: true })).toEqual({
      fr: "Président",
      ar: "رئيس",
    });
    expect(() => validateLocalized({ en: "President" }, { label: "Le titre", max: 200, requireFr: true })).toThrow("en français est requis");
    expect(() => validateLocalized({ fr: "x".repeat(5001) }, { label: "La biographie", max: 5000 })).toThrow("5000");
    expect(validateLocalized(undefined, { label: "La biographie", max: 5000 })).toEqual({});
  });

  it("validateOrder et validateReorderIds", () => {
    expect(validateOrder(3)).toBe(3);
    expect(() => validateOrder(-1)).toThrow();
    expect(() => validateOrder(1.5)).toThrow();
    const valid = (id: string) => /^[a-f0-9]{24}$/.test(id);
    expect(validateReorderIds([ID, ID2], valid)).toEqual([ID, ID2]);
    expect(() => validateReorderIds([], valid)).toThrow("vide");
    expect(() => validateReorderIds([ID, ID], valid)).toThrow("doublons");
    expect(() => validateReorderIds(["nope"], valid)).toThrow("invalide");
  });

  it("findFreeSlug ajoute un suffixe tant que le slug est pris", async () => {
    const taken = new Set(["cabrel-domfang", "cabrel-domfang-2"]);
    expect(await findFreeSlug("Cabrel Domfang", async (s) => taken.has(s))).toBe("cabrel-domfang-3");
    expect(await findFreeSlug("عبد", async () => false)).toBe("leader");
  });
});

describe("resolvers leaders", () => {
  it("la requête publique ne renvoie que les fiches visibles, triées par ordre", async () => {
    await leaderResolvers.Query.leaders();
    expect(model.find).toHaveBeenCalledWith({ isActive: true });
    await leaderResolvers.Query.leader(null, { slug: " Cabrel-Domfang " });
    expect(model.findOne).toHaveBeenCalledWith({ slug: "cabrel-domfang", isActive: true });
  });

  it("crée un leader : slug généré, photo envoyée sur Cloudinary, placé en fin de liste", async () => {
    model.findOne.mockReturnValue(chain({ order: 5 }));
    const created: any = await leaderResolvers.Mutation.createLeader(null, {
      input: { name: "Élodie Mbarga", title: { fr: "Trésorière", en: "" }, bio: { fr: "Bio" }, avatar: PNG },
    });
    expect(uploadFromBase64).toHaveBeenCalledWith(PNG, { folder: "leaders", resource_type: "image" });
    expect(created).toMatchObject({
      slug: "elodie-mbarga",
      title: { fr: "Trésorière" },
      avatarPublicId: "leaders/x",
      order: 6,
      isActive: true,
    });
  });

  it("refuse un titre français manquant, une photo non image et un slug déjà pris", async () => {
    await expect(
      leaderResolvers.Mutation.createLeader(null, { input: { name: "A", title: { en: "x" }, avatar: PNG } })
    ).rejects.toThrow("en français est requis");
    await expect(
      leaderResolvers.Mutation.createLeader(null, { input: { name: "A", title: { fr: "x" }, avatar: PDF } })
    ).rejects.toThrow("type de fichier non autorisé");
    await expect(
      leaderResolvers.Mutation.createLeader(null, { input: { name: "A", title: { fr: "x" } } })
    ).rejects.toThrow("photo du leader est requise");
    model.exists.mockResolvedValue({ _id: ID2 });
    await expect(
      leaderResolvers.Mutation.createLeader(null, { input: { name: "A", slug: "cabrel-domfang", title: { fr: "x" }, avatar: PNG } })
    ).rejects.toThrow("déjà utilisé");
    expect(uploadFromBase64).not.toHaveBeenCalled();
  });

  it("met à jour la photo et supprime l'ancienne image Cloudinary", async () => {
    model.findById.mockReturnValue(chain({ _id: ID, slug: "a", avatar: "https://old", avatarPublicId: "leaders/old" }));
    model.findByIdAndUpdate.mockReturnValue(chain({ _id: ID, slug: "a" }));
    await leaderResolvers.Mutation.updateLeader(null, { id: ID, input: { avatar: PNG, isActive: false } });
    expect(model.findByIdAndUpdate.mock.calls[0][1]).toEqual({
      $set: { isActive: false, avatar: "https://res.cloudinary.com/demo/image/upload/v1/leaders/x.webp", avatarPublicId: "leaders/x" },
    });
    expect(deleteImage).toHaveBeenCalledWith("leaders/old");
  });

  it("refuse un identifiant invalide et un slug pris par un autre leader", async () => {
    await expect(leaderResolvers.Mutation.updateLeader(null, { id: "x", input: {} })).rejects.toThrow("invalide");
    model.findById.mockReturnValue(chain({ _id: ID, slug: "a" }));
    model.exists.mockResolvedValue({ _id: ID2 });
    await expect(leaderResolvers.Mutation.updateLeader(null, { id: ID, input: { slug: "b" } })).rejects.toThrow("déjà utilisé");
  });

  it("supprime la fiche et sa photo", async () => {
    model.findByIdAndDelete.mockReturnValue(chain({ _id: ID, avatarPublicId: "leaders/x" }));
    expect(await leaderResolvers.Mutation.deleteLeader(null, { id: ID })).toBe(true);
    expect(deleteImage).toHaveBeenCalledWith("leaders/x");
    model.findByIdAndDelete.mockReturnValue(chain(null));
    expect(await leaderResolvers.Mutation.deleteLeader(null, { id: ID })).toBe(false);
  });

  it("une erreur Cloudinary à la suppression ne bloque pas", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    deleteImage.mockRejectedValue(new Error("down"));
    model.findByIdAndDelete.mockReturnValue(chain({ _id: ID, avatarPublicId: "leaders/x" }));
    expect(await leaderResolvers.Mutation.deleteLeader(null, { id: ID })).toBe(true);
  });

  it("réordonne : order = position dans la liste", async () => {
    await leaderResolvers.Mutation.reorderLeaders(null, { ids: [ID2, ID] });
    expect(model.bulkWrite).toHaveBeenCalledWith([
      { updateOne: { filter: { _id: ID2 }, update: { $set: { order: 0 } } } },
      { updateOne: { filter: { _id: ID }, update: { $set: { order: 1 } } } },
    ]);
  });
});

describe("autorisations leaders", () => {
  const ADMIN_OPS = { Query: ["adminLeaders"], Mutation: ["createLeader", "updateLeader", "deleteLeader", "reorderLeaders"] };

  // Les autres opérations admin sont simulées : applyAdminGuards exige qu'elles existent toutes.
  const guard = () => {
    const stubs: Record<"Query" | "Mutation", Record<string, () => string>> = { Query: {}, Mutation: {} };
    for (const type of ["Query", "Mutation"] as const) {
      for (const name of ADMIN_ONLY_OPERATIONS[type]) {
        if (!(name in (leaderResolvers as any)[type])) stubs[type][name] = () => "ok";
      }
    }
    const [guarded] = applyAdminGuards([leaderResolvers, stubs]);
    return guarded;
  };

  it("les opérations de gestion sont réservées à l'admin", () => {
    for (const type of ["Query", "Mutation"] as const) {
      for (const name of ADMIN_OPS[type]) expect(ADMIN_ONLY_OPERATIONS[type] as readonly string[]).toContain(name);
    }
    const guarded = guard();
    const publicCtx = { admin: null };
    expect(() => guarded.Query.adminLeaders(null, {}, publicCtx, null)).toThrow("Authentification admin requise.");
    for (const name of ADMIN_OPS.Mutation) {
      expect(() => guarded.Mutation[name](null, { id: ID, input: {}, ids: [ID] }, publicCtx, null)).toThrow("Authentification admin requise.");
    }
    expect(model.bulkWrite).not.toHaveBeenCalled();
  });

  it("l'admin y a accès ; la liste publique reste ouverte", async () => {
    const guarded = guard();
    const adminCtx = { admin: { email: "admin@lapnomba.org", role: "admin" as const } };
    await guarded.Query.adminLeaders(null, {}, adminCtx, null);
    expect(model.find).toHaveBeenCalledWith();
    await guarded.Query.leaders(null, {}, { admin: null }, null);
    expect(model.find).toHaveBeenCalledWith({ isActive: true });
  });
});

describe("seed des leaders", () => {
  const makeFrontend = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "leaders-seed-"));
    for (const lang of ["fr", "en", "tr", "ar"]) {
      const entries: Record<string, string> = {};
      for (const s of LEADER_SEED_SOURCES) {
        entries[`leaders.${s.key}.title`] = lang === "tr" ? "" : `${lang} titre ${s.key}`;
        entries[`leaders.${s.key}.description`] = `${lang} bio ${s.key}`;
      }
      fs.mkdirSync(path.join(dir, "public", "locales", lang), { recursive: true });
      fs.writeFileSync(path.join(dir, "public", "locales", lang, "translate.json"), JSON.stringify(entries));
    }
    const img = path.join(dir, "src", "assets", "images", "leaders");
    fs.mkdirSync(img, { recursive: true });
    for (const s of LEADER_SEED_SOURCES) fs.writeFileSync(path.join(img, s.image), "img");
    return dir;
  };

  it("lit titres et biographies dans les 4 langues, dans l'ordre de la page", () => {
    const seeds = buildLeaderSeeds(makeFrontend());
    expect(seeds.map((s) => s.slug)).toEqual(LEADER_SEED_SOURCES.map((s) => s.slug));
    expect(seeds[0]).toMatchObject({
      slug: "abdel-naser",
      order: 0,
      title: { fr: "fr titre 3", en: "en titre 3", ar: "ar titre 3" },
      bio: { fr: "fr bio 3", en: "en bio 3", tr: "tr bio 3", ar: "ar bio 3" },
    });
    expect(seeds[0].title.tr).toBeUndefined();
  });

  it("signale une photo manquante", () => {
    const dir = makeFrontend();
    fs.unlinkSync(path.join(dir, "src", "assets", "images", "leaders", "cabrel.jpg"));
    expect(() => buildLeaderSeeds(dir)).toThrow("Photo introuvable");
  });

  it("est idempotent : un slug existant n'est ni réimporté ni modifié", async () => {
    const seeds = buildLeaderSeeds(makeFrontend());
    const existing = new Set(["abdel-naser", "cabrel-domfang"]);
    const upload = jest.fn(async () => ({ secure_url: "https://res.cloudinary.com/x.jpg", public_id: "leaders/p" }));
    const create = jest.fn(async (doc: any) => doc);
    const result = await seedLeaders(seeds, { exists: async (s) => existing.has(s), upload, create, log: () => undefined });
    expect(result).toEqual({ created: 4, skipped: 2, total: 6 });
    expect(upload).toHaveBeenCalledTimes(4);
    expect(create.mock.calls.map((c: any[]) => c[0].slug)).not.toContain("abdel-naser");
    expect(create.mock.calls[0][0]).toMatchObject({ isActive: true, avatarPublicId: "leaders/p" });
  });
});
