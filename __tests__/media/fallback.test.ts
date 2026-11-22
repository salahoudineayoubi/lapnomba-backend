const storedModel = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
};
jest.mock("../../src/models/storedFile", () => ({ StoredFileModel: storedModel }));

const upload = jest.fn();
const destroy = jest.fn();
jest.mock("cloudinary", () => ({
  __esModule: true,
  default: { v2: { config: jest.fn(), uploader: { upload, destroy }, utils: { private_download_url: jest.fn(() => "https://dl") } } },
}));

process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "x";
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "x";
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "x";
process.env.APP_BASE_URL = "https://api.example.org";

import { uploadFromBase64, deleteImage } from "../../src/utils/cloudinary";
import { uploadPrivateDataUri, deletePrivateFile } from "../../src/utils/privateFiles";
import {
  cloudinaryLikelyDown,
  isCloudinaryUnavailable,
  markCloudinaryUp,
  parseDataUri,
  serveMedia,
} from "../../src/services/mediaFallback";
import { migrateFallbackFiles } from "../../src/services/mediaFallback/migrate";

const ID = "64b7f0c2a1b2c3d4e5f60718";
const PNG = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]).toString("base64")}`;
const disabled = Object.assign(new Error("cloud_name is disabled"), { http_code: 401 });

const res = () => {
  const r: any = { headers: {} as Record<string, string> };
  r.setHeader = (k: string, v: string) => ((r.headers[k] = v), r);
  r.status = jest.fn(() => r);
  r.type = jest.fn(() => r);
  r.send = jest.fn(() => r);
  r.redirect = jest.fn(() => r);
  return r;
};

beforeEach(() => {
  jest.clearAllMocks();
  markCloudinaryUp();
  storedModel.create.mockImplementation(async (d: any) => ({ ...d, _id: ID, id: ID }));
});

describe("détection d'une panne Cloudinary", () => {
  it("compte désactivé, refus, limite, panne serveur ou réseau = indisponible", () => {
    expect(isCloudinaryUnavailable(disabled)).toBe(true);
    expect(isCloudinaryUnavailable({ http_code: 420, message: "Rate Limited" })).toBe(true);
    expect(isCloudinaryUnavailable({ http_code: 503, message: "x" })).toBe(true);
    expect(isCloudinaryUnavailable(new Error("getaddrinfo ENOTFOUND api.cloudinary.com"))).toBe(true);
    expect(isCloudinaryUnavailable({ error: { http_code: 401, message: "cloud_name is disabled" } })).toBe(true);
  });
  it("fichier invalide (400) = vraie erreur, pas de secours", () => {
    expect(isCloudinaryUnavailable({ http_code: 400, message: "Invalid image file" })).toBe(false);
  });
  it("lit un data URI", () => {
    const p = parseDataUri(PNG)!;
    expect(p.mime).toBe("image/png");
    expect(p.buffer[0]).toBe(0x89);
    expect(parseDataUri("https://x/y.png")).toBeNull();
  });
});

describe("images publiques", () => {
  it("Cloudinary disponible : envoi normal", async () => {
    upload.mockResolvedValueOnce({ secure_url: "https://res.cloudinary.com/a.png", public_id: "leaders/a" });
    const r = await uploadFromBase64(PNG, { folder: "leaders", resource_type: "image" });
    expect(r.secure_url).toBe("https://res.cloudinary.com/a.png");
    expect(storedModel.create).not.toHaveBeenCalled();
  });

  it("compte désactivé : image gardée dans la base et servie par le backend", async () => {
    upload.mockRejectedValueOnce(disabled);
    const r = await uploadFromBase64(PNG, { folder: "leaders", resource_type: "image" });
    expect(r).toMatchObject({ secure_url: `https://api.example.org/media/${ID}.png`, public_id: `local/${ID}`, fallback: true });
    expect(storedModel.create).toHaveBeenCalledWith(expect.objectContaining({ visibility: "public", contentType: "image/png", folder: "leaders" }));
    expect(cloudinaryLikelyDown()).toBe(true);
    // Envoi suivant : on ne fait pas attendre l'admin sur Cloudinary pendant la pause.
    await uploadFromBase64(PNG, { folder: "leaders", resource_type: "image" });
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("fichier refusé (400) : l'erreur remonte telle quelle", async () => {
    upload.mockRejectedValueOnce({ http_code: 400, message: "Invalid image file" });
    await expect(uploadFromBase64(PNG, { resource_type: "image" })).rejects.toMatchObject({ http_code: 400 });
    expect(storedModel.create).not.toHaveBeenCalled();
  });

  it("supprimer une image de secours (transférée ou non)", async () => {
    storedModel.findByIdAndDelete.mockResolvedValueOnce({ migratedPublicId: "leaders/zz" });
    await deleteImage(`local/${ID}`);
    expect(storedModel.findByIdAndDelete).toHaveBeenCalledWith(ID);
    expect(destroy).toHaveBeenCalledWith("leaders/zz", expect.anything());
  });
});

describe("route /media", () => {
  it("sert l'image tant qu'elle est dans la base", async () => {
    storedModel.findById.mockResolvedValueOnce({ visibility: "public", contentType: "image/png", ext: "png", data: Buffer.from("abc") });
    const r = res();
    await serveMedia({ params: { file: `${ID}.png` } } as any, r);
    expect(r.headers["Content-Type"]).toBe("image/png");
    expect(r.send).toHaveBeenCalledWith(Buffer.from("abc"));
  });
  it("redirige vers Cloudinary une fois transférée", async () => {
    storedModel.findById.mockResolvedValueOnce({ visibility: "public", migratedUrl: "https://res.cloudinary.com/b.png" });
    const r = res();
    await serveMedia({ params: { file: `${ID}.png` } } as any, r);
    expect(r.redirect).toHaveBeenCalledWith(301, "https://res.cloudinary.com/b.png");
  });
  it("ne sert jamais un document privé", async () => {
    storedModel.findById.mockResolvedValueOnce({ visibility: "private", data: Buffer.from("cni") });
    const r = res();
    await serveMedia({ params: { file: `${ID}.jpg` } } as any, r);
    expect(r.status).toHaveBeenCalledWith(404);
    expect(r.send).not.toHaveBeenCalledWith(Buffer.from("cni"));
  });
});

describe("documents privés (pièces d'identité, CV)", () => {
  it("compte désactivé : référence privée vers le stockage de secours", async () => {
    upload.mockRejectedValueOnce(disabled);
    const ref = await uploadPrivateDataUri(PNG, { folder: "admissions/identite/s1", resourceType: "image", format: "jpg" });
    expect(ref).toBe(`private:image:jpg:local/${ID}`);
    expect(storedModel.create).toHaveBeenCalledWith(expect.objectContaining({ visibility: "private" }));
  });
  it("suppression", async () => {
    storedModel.findByIdAndDelete.mockResolvedValueOnce({});
    await deletePrivateFile(`private:image:jpg:local/${ID}`);
    expect(storedModel.findByIdAndDelete).toHaveBeenCalledWith(ID);
    expect(destroy).not.toHaveBeenCalled();
  });
});

describe("retour automatique vers Cloudinary", () => {
  const doc = (over: any = {}) => ({
    visibility: "public",
    resourceType: "image",
    contentType: "image/png",
    ext: "png",
    folder: "leaders",
    data: Buffer.from("abc"),
    migrationAttempts: 0,
    save: jest.fn(),
    ...over,
  });
  const findReturning = (docs: any[]) =>
    storedModel.find.mockReturnValueOnce({ sort: () => ({ limit: async () => docs }) });

  it("transfère les fichiers et libère la base", async () => {
    const d = doc();
    findReturning([d]);
    storedModel.countDocuments.mockResolvedValueOnce(0);
    upload.mockResolvedValueOnce({ secure_url: "https://res.cloudinary.com/c.png", public_id: "leaders/c" });
    const r = await migrateFallbackFiles();
    expect(r).toEqual({ migrated: 1, pending: 0, stopped: false });
    expect(d).toMatchObject({ migratedUrl: "https://res.cloudinary.com/c.png", migratedPublicId: "leaders/c", data: undefined });
    expect(d.save).toHaveBeenCalled();
  });

  it("Cloudinary encore bloqué : on s'arrête et on réessaiera plus tard", async () => {
    const a = doc();
    const b = doc();
    findReturning([a, b]);
    storedModel.countDocuments.mockResolvedValueOnce(2);
    upload.mockRejectedValueOnce(disabled);
    const r = await migrateFallbackFiles();
    expect(r.stopped).toBe(true);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(a.data).toBeDefined();
    expect(a.migrationAttempts).toBe(1);
  });

  it("document privé : renvoyé en mode authentifié (pas d'URL publique)", async () => {
    const d = doc({ visibility: "private", ext: "jpg" });
    findReturning([d]);
    storedModel.countDocuments.mockResolvedValueOnce(0);
    upload.mockResolvedValueOnce({ secure_url: "https://res.cloudinary.com/p.jpg", public_id: "admissions/p" });
    await migrateFallbackFiles();
    expect(upload.mock.calls[0][1]).toMatchObject({ type: "authenticated" });
    expect((d as any).migratedUrl).toBeUndefined();
    expect((d as any).migratedPublicId).toBe("admissions/p");
  });
});
