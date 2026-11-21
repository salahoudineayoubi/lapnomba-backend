jest.mock("../../src/utils/cloudinary", () => ({}));
jest.mock("cloudinary", () => ({ __esModule: true, default: { v2: { utils: { private_download_url: () => "https://api.cloudinary.test/x" }, uploader: {} } } }));
jest.mock("axios", () => ({ __esModule: true, default: { get: jest.fn() } }));

import axios from "axios";
import { Readable } from "stream";
import { getPrivateFileUrl, servePrivateFile } from "../../src/utils/privateFiles";

const fakeRes = () => {
  const res: any = { headers: {} as Record<string, string> };
  res.status = jest.fn(() => res);
  res.type = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.setHeader = jest.fn((k: string, v: string) => (res.headers[k] = v));
  return res;
};
const tokenOf = (url: string) => url.split("/files/private/")[1];

describe("relais des fichiers privés (/files/private/:token)", () => {
  it("lien valide : sert le PDF en ligne", async () => {
    const stream = Readable.from(["%PDF-1.4"]);
    (stream as any).pipe = jest.fn();
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: stream });
    const res = fakeRes();
    await servePrivateFile({ params: { token: tokenOf(getPrivateFileUrl("private:raw:pdf:admissions/cv/x")) } } as any, res);
    expect(res.headers["Content-Type"]).toBe("application/pdf");
    expect(res.headers["Content-Disposition"]).toMatch(/^inline/);
    expect((stream as any).pipe).toHaveBeenCalledWith(res);
  });

  it("lien modifié : refusé (403)", async () => {
    const tok = tokenOf(getPrivateFileUrl("private:image:jpg:admissions/identite/a"));
    const [payload, sig] = tok.split(".");
    const other = Buffer.from(JSON.stringify({ r: "private:image:jpg:admissions/identite/AUTRE", e: 9999999999 })).toString("base64url");
    const res = fakeRes();
    await servePrivateFile({ params: { token: `${other}.${sig}` } } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(payload).not.toBe(other);
  });

  it("lien expiré : refusé (410)", async () => {
    const res = fakeRes();
    await servePrivateFile({ params: { token: tokenOf(getPrivateFileUrl("private:raw:pdf:x", -5)) } } as any, res);
    expect(res.status).toHaveBeenCalledWith(410);
  });
});
