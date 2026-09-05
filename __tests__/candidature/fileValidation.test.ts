import {
  detectFileSignature,
  parseDataUri,
  validateUploadedFile,
  FileValidationError,
} from "../../src/utils/fileValidation";

const PDF_BYTES = Buffer.from("%PDF-1.4\n%âãÏÓ\nrest of a fake pdf body", "binary");
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const WEBP_BYTES = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP", "ascii"),
]);
const DOC_BYTES = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
const DOCX_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
const GARBAGE_BYTES = Buffer.from("this is not a real file at all", "utf8");

const toDataUri = (mime: string, buffer: Buffer) =>
  `data:${mime};base64,${buffer.toString("base64")}`;

describe("fileValidation.detectFileSignature", () => {
  it("détecte un PDF", () => {
    expect(detectFileSignature(PDF_BYTES)).toEqual({ mime: "application/pdf", extension: "pdf" });
  });

  it("détecte un JPEG", () => {
    expect(detectFileSignature(JPEG_BYTES)).toEqual({ mime: "image/jpeg", extension: "jpg" });
  });

  it("détecte un PNG", () => {
    expect(detectFileSignature(PNG_BYTES)).toEqual({ mime: "image/png", extension: "png" });
  });

  it("détecte un WEBP", () => {
    expect(detectFileSignature(WEBP_BYTES)).toEqual({ mime: "image/webp", extension: "webp" });
  });

  it("détecte un DOC legacy", () => {
    expect(detectFileSignature(DOC_BYTES)).toEqual({ mime: "application/msword", extension: "doc" });
  });

  it("détecte un DOCX", () => {
    expect(detectFileSignature(DOCX_BYTES)).toEqual({
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: "docx",
    });
  });

  it("retourne null pour un contenu non reconnu", () => {
    expect(detectFileSignature(GARBAGE_BYTES)).toBeNull();
  });
});

describe("fileValidation.parseDataUri", () => {
  it("extrait le mime déclaré et le buffer décodé", () => {
    const parsed = parseDataUri(toDataUri("application/pdf", PDF_BYTES));
    expect(parsed?.declaredMime).toBe("application/pdf");
    expect(parsed?.buffer.equals(PDF_BYTES)).toBe(true);
  });

  it("retourne null pour une chaîne qui n'est pas une data URI", () => {
    expect(parseDataUri("https://example.com/file.pdf")).toBeNull();
  });
});

describe("fileValidation.validateUploadedFile", () => {
  const CV_OPTS = {
    allowedMimes: ["application/pdf", "application/msword"],
    maxBytes: 1024 * 1024,
    label: "CV",
  };

  it("accepte un PDF valide déclaré correctement", () => {
    const detected = validateUploadedFile(toDataUri("application/pdf", PDF_BYTES), CV_OPTS);
    expect(detected.mime).toBe("application/pdf");
  });

  it("se base sur la signature réelle, pas sur le mime déclaré par le client", () => {
    // Le client ment sur le Content-Type ("application/pdf") mais le contenu
    // réel est un JPEG (non autorisé pour un CV) -> doit être rejeté.
    const maliciousDataUri = toDataUri("application/pdf", JPEG_BYTES);
    expect(() => validateUploadedFile(maliciousDataUri, CV_OPTS)).toThrow(FileValidationError);
  });

  it("rejette un fichier dont le type réel n'est pas autorisé", () => {
    expect(() =>
      validateUploadedFile(toDataUri("image/png", PNG_BYTES), CV_OPTS)
    ).toThrow(FileValidationError);
  });

  it("rejette un contenu non reconnu (magic bytes absents)", () => {
    expect(() =>
      validateUploadedFile(toDataUri("application/pdf", GARBAGE_BYTES), CV_OPTS)
    ).toThrow(FileValidationError);
  });

  it("rejette un fichier trop volumineux", () => {
    const bigBuffer = Buffer.concat([PDF_BYTES, Buffer.alloc(2 * 1024 * 1024, 0)]);
    expect(() =>
      validateUploadedFile(toDataUri("application/pdf", bigBuffer), CV_OPTS)
    ).toThrow(/trop volumineux/);
  });

  it("rejette une data URI malformée", () => {
    expect(() => validateUploadedFile("not-a-data-uri", CV_OPTS)).toThrow(FileValidationError);
  });
});
