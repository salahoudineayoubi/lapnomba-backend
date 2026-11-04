/**
 * Idempotence de la migration catalogue Academy → MongoDB (Phase 3).
 * Modèle entièrement mocké en mémoire (Map par slug), aucune connexion
 * réelle. Vérifie : exécuter deux fois ne crée aucun doublon, et aucune
 * formation "Trading" n'est jamais insérée.
 */

const store = new Map<string, any>();
let nextId = 1;

jest.mock("../../src/models/acdemy/program", () => {
  const ctor: any = {};

  ctor.findOne = jest.fn(async ({ slug }: { slug: string }) => {
    return store.has(slug) ? { ...store.get(slug) } : null;
  });

  ctor.create = jest.fn(async (data: any) => {
    const doc = { _id: `id-${nextId++}`, ...data };
    store.set(data.slug, doc);
    return doc;
  });

  ctor.updateOne = jest.fn(async ({ _id }: any, { $set }: any) => {
    for (const [slug, doc] of store) {
      if (doc._id === _id) {
        store.set(slug, { ...doc, ...$set });
        break;
      }
    }
    return { acknowledged: true };
  });

  return { __esModule: true, default: ctor };
});

import { seedAcademyPrograms } from "../../src/scripts/seedAcademyPrograms";

beforeEach(() => {
  store.clear();
  nextId = 1;
  jest.clearAllMocks();
});

describe("seedAcademyPrograms (idempotence)", () => {
  it("crée les 9 programmes au premier passage", async () => {
    const result = await seedAcademyPrograms();

    expect(result.created).toBe(9);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(0);
    expect(result.skipped).toBe(0);
    expect(store.size).toBe(9);
  });

  it("ne crée aucun doublon au second passage (tout inchangé)", async () => {
    await seedAcademyPrograms();
    const second = await seedAcademyPrograms();

    expect(second.created).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(9);
    expect(store.size).toBe(9);
  });

  it("ne contient jamais de formation Trading", async () => {
    await seedAcademyPrograms();

    for (const doc of store.values()) {
      expect(doc.title.toLowerCase()).not.toMatch(/trading|forex|algo-trading/);
      expect(doc.slug.toLowerCase()).not.toMatch(/trading|forex/);
    }
  });

  it("préserve un programme Mongo existant dont le slug n'est pas dans le catalogue source", async () => {
    store.set("programme-admin-personnalise", {
      _id: "custom-1",
      slug: "programme-admin-personnalise",
      title: "Programme créé par un admin",
    });

    await seedAcademyPrograms();

    expect(store.has("programme-admin-personnalise")).toBe(true);
    expect(store.get("programme-admin-personnalise").title).toBe("Programme créé par un admin");
  });
});
