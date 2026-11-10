jest.mock("../../src/models/crowdfunding_campaign", () => ({
  CAMPAIGN_LANGUAGES: ["fr", "en", "tr", "ar"],
  CrowdfundingCampaignModel: { findOne: jest.fn() },
}));
jest.mock("../../src/utils/logger", () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import express from "express";
import { AddressInfo } from "net";
import { CrowdfundingCampaignModel } from "../../src/models/crowdfunding_campaign";
import shareRouter, {
  escapeHtml,
  resolveShareImage,
  toPlainExcerpt,
} from "../../src/api/routes/campaignShare.routes";

const mockFindOne = (value: any) => {
  (CrowdfundingCampaignModel.findOne as jest.Mock).mockReturnValue({
    select: () => ({ lean: () => (value instanceof Error ? Promise.reject(value) : Promise.resolve(value)) }),
  });
};

const meta = (html: string, prop: string) => {
  const m = html.match(new RegExp(`<meta (?:property|name)="${prop}" content="([^"]*)">`));
  return m ? m[1] : undefined;
};

describe("aperçu de partage des collectes", () => {
  let baseUrl: string;
  let server: any;

  beforeAll((done) => {
    delete process.env.DONATE_SITE_URL;
    process.env.APP_BASE_URL = "https://api.example.org";
    const app = express();
    app.set("trust proxy", 1);
    app.use(shareRouter);
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      done();
    });
  });

  afterAll((done) => {
    server.closeAllConnections?.();
    server.close(done);
  });

  beforeEach(() => jest.clearAllMocks());

  const get = (path: string, ua = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)") =>
    fetch(`${baseUrl}${path}`, { headers: { "User-Agent": ua }, redirect: "manual" });

  it("renvoie les balises OG de la collecte (200, image preset absolue, cache court)", async () => {
    mockFindOne({
      title: "Ordinateurs pour le club de Mvog-Ada",
      slug: "ordinateurs-mvog-ada",
      story: "Nous collectons 500 000 XAF pour équiper 20 jeunes.\n\nMerci à tous !",
      coverImage: "preset:equipment",
    });

    const res = await get("/share/collecte/ordinateurs-mvog-ada");
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    expect(res.headers.get("cache-control")).toBe("public, max-age=300");
    expect(meta(html, "og:title")).toBe("Ordinateurs pour le club de Mvog-Ada — Soutenez cette collecte");
    expect(meta(html, "og:description")).toBe("Nous collectons 500 000 XAF pour équiper 20 jeunes. Merci à tous !");
    expect(meta(html, "og:image")).toBe("https://donate.lapnomba.org/og/collecte/equipment.jpg");
    expect(meta(html, "og:image:width")).toBe("1200");
    // og:url / canonical = l'aperçu lui-même (sinon Facebook irait lire la SPA générique).
    expect(meta(html, "og:url")).toMatch(/^https?:\/\/[^/]+\/share\/collecte\/ordinateurs\-mvog\-ada$/);
    expect(meta(html, "twitter:card")).toBe("summary_large_image");
    expect(html).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+\/share\/collecte\/ordinateurs-mvog-ada">/);
    // Robot : pas de meta refresh.
    expect(html).not.toContain('http-equiv="refresh"');
    expect(html).toContain('window.location.replace("https://donate.lapnomba.org/collecte/ordinateurs-mvog-ada")');
    expect(html).toContain('<a href="https://donate.lapnomba.org/collecte/ordinateurs-mvog-ada">');
  });

  it("navigateur : redirection immédiate vers la page de la collecte", async () => {
    mockFindOne({ title: "T", slug: "t", coverImage: "preset:youth" });
    const res = await get("/s/c/t?lang=en", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1");
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=https://donate.lapnomba.org/collecte/t?lang=en">');
    expect(meta(html, "og:url")).toMatch(/^https?:\/\/[^/]+\/share\/collecte\/t\?lang=en$/);
  });

  it.each(["WhatsApp/2.23.20.0", "Twitterbot/1.0", "LinkedInBot/1.0 (compatible; Mozilla/5.0)", "TelegramBot (like TwitterBot)"])(
    "répond 200 au robot %s",
    async (ua) => {
      mockFindOne({ title: "T", slug: "t", coverImage: "preset:youth" });
      const res = await get("/s/c/t", ua);
      expect(res.status).toBe(200);
      expect(meta(await res.text(), "og:image")).toBe("https://donate.lapnomba.org/og/collecte/youth.jpg");
    }
  );

  it("collecte inconnue → 404 qui redirige vers la liste", async () => {
    mockFindOne(null);
    const res = await get("/share/collecte/inconnue");
    const html = await res.text();
    expect(res.status).toBe(404);
    expect(meta(html, "og:url")).toBe("https://donate.lapnomba.org/collecte");
    expect(html).toContain('window.location.replace("https://donate.lapnomba.org/collecte")');
  });

  it("slug invalide → 404 sans requête en base", async () => {
    const res = await get("/share/collecte/%3Cscript%3E");
    expect(res.status).toBe(404);
    expect(CrowdfundingCampaignModel.findOne).not.toHaveBeenCalled();
  });

  it("échappe tout le texte saisi par l'organisateur (XSS)", async () => {
    mockFindOne({
      title: '"><script>alert(1)</script>',
      slug: "xss",
      story: "<img src=x onerror=alert(1)> & \"quotes\" 'single'",
      coverImage: 'https://res.cloudinary.com/x/image.jpg?"><script>',
    });
    const html = await (await get("/share/collecte/xss")).text();
    expect(html).not.toMatch(/<script>alert/);
    expect(html).not.toContain("<img");
    expect(html).not.toContain('?"><script>');
    expect(meta(html, "og:title")).toMatch(/^&quot;&gt;/);
    // Seul le <script> de redirection est présent.
    expect(html.match(/<script/g)).toHaveLength(1);
  });

  it("échappe les caractères spéciaux sans les perdre", async () => {
    mockFindOne({ title: `Tom & "Jerry" <3 'ok'`, slug: "tom" });
    const html = await (await get("/share/collecte/tom")).text();
    expect(meta(html, "og:title")).toBe("Tom &amp; &quot;Jerry&quot; &lt;3 &#39;ok&#39; — Soutenez cette collecte");
  });

  it("sans image → image adaptée au titre", async () => {
    mockFindOne({ title: "Sans image", slug: "sans-image", story: "" });
    const html = await (await get("/share/collecte/sans-image?lang=en")).text();
    expect(meta(html, "og:image")).toBe("https://donate.lapnomba.org/og/collecte/training.jpg");
    expect(meta(html, "og:title")).toBe("Sans image — Support this fundraiser");
    expect(meta(html, "og:description")).toMatch(/^Support this fundraiser/);
  });

  it("utilise la traduction dans la langue du partage", async () => {
    mockFindOne({
      title: "Des ordinateurs pour Mvog-Ada",
      slug: "ordis",
      story: "Nous collectons 500 000 XAF.",
      originalLanguage: "fr",
      titleI18n: { en: "Computers for Mvog-Ada", tr: "Mvog-Ada için bilgisayarlar" },
      storyI18n: { en: "We are raising 500,000 XAF." },
    });
    const en = await (await get("/share/collecte/ordis?lang=en")).text();
    expect(meta(en, "og:title")).toBe("Computers for Mvog-Ada — Support this fundraiser");
    expect(meta(en, "og:description")).toBe("We are raising 500,000 XAF.");
    expect(en).toContain('<html lang="en">');

    const tr = await (await get("/share/collecte/ordis?lang=tr")).text();
    expect(meta(tr, "og:title")).toBe("Mvog-Ada için bilgisayarlar — Bu bağış kampanyasını destekleyin");
    // Pas d'histoire traduite en turc → texte original.
    expect(meta(tr, "og:description")).toBe("Nous collectons 500 000 XAF.");

    const ar = await (await get("/share/collecte/ordis?lang=ar")).text();
    expect(ar).toContain('<html lang="ar" dir="rtl">');
    expect(meta(ar, "og:title")).toMatch(/^Des ordinateurs pour Mvog-Ada/);
  });

  it("erreur base de données → 200 générique qui redirige quand même vers la collecte", async () => {
    mockFindOne(new Error("db down"));
    const res = await get("/share/collecte/ma-collecte");
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(meta(html, "og:url")).toMatch(/^https?:\/\/[^/]+\/share\/collecte\/ma\-collecte$/);
    expect(html).toContain('window.location.replace("https://donate.lapnomba.org/collecte/ma-collecte")');
  });
});

describe("helpers", () => {
  it("escapeHtml", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });

  it("toPlainExcerpt tronque sur un mot avec une ellipse", () => {
    const long = "mot ".repeat(100);
    const out = toPlainExcerpt(long, 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith("…")).toBe(true);
    expect(toPlainExcerpt("<b>Gras</b>\n\nsuite")).toBe("Gras suite");
  });

  it("resolveShareImage", () => {
    process.env.APP_BASE_URL = "https://api.example.org";
    expect(resolveShareImage(undefined).url).toBe("https://donate.lapnomba.org/og/collecte/training.jpg");
    expect(resolveShareImage(undefined, undefined, "De Zaguina à Lap Nomba : construisez l'avenir d'un jeune").url).toBe("https://donate.lapnomba.org/og/collecte/coding.jpg");
    expect(resolveShareImage(undefined, undefined, "Un ordinateur pour former un jeune").url).toBe("https://donate.lapnomba.org/og/collecte/laptop.jpg");
    expect(resolveShareImage("preset:awareness", undefined, "Sortir les jeunes du Zaguina").url).toBe("https://donate.lapnomba.org/og/collecte/despair.jpg");
    expect(resolveShareImage("preset:unknown").url).toBe("https://donate.lapnomba.org/og-donate.jpg");
    expect(resolveShareImage("/static/media/old.123.webp").url).toBe("https://donate.lapnomba.org/og/collecte/training.jpg");
    expect(resolveShareImage("http://insecure.example/x.jpg").url).toBe("https://donate.lapnomba.org/og-donate.jpg");
    expect(resolveShareImage("https://res.cloudinary.com/demo/a.jpg")).toEqual({ url: "https://res.cloudinary.com/demo/a.jpg" });
    expect(resolveShareImage("/uploads/c/a.jpg").url).toBe("https://api.example.org/uploads/c/a.jpg");
    process.env.DONATE_SITE_URL = "https://staging-donate.example.org/";
    expect(resolveShareImage("preset:field").url).toBe("https://staging-donate.example.org/og/collecte/field.jpg");
    delete process.env.DONATE_SITE_URL;
  });
});

describe("aperçu de partage des pages du site de dons", () => {
  const { pageShareHandler } = require("../../src/api/routes/campaignShare.routes");
  const run = (page: string, query: Record<string, string>, ua = "WhatsApp/2.23") => {
    let body = "";
    const res: any = { status: () => res, set: () => res, send: (h: string) => ((body = h), res) };
    const req: any = { params: { page }, query, get: (h: string) => (h.toLowerCase() === "user-agent" ? ua : h === "host" ? "api.test" : undefined) };
    pageShareHandler(req, res);
    return body;
  };

  it("don matériel en arabe : titre traduit, image du matériel, page dans la langue choisie", () => {
    const html = run("material", { lang: "ar" });
    expect(html).toContain("تبرّع بحاسوب لشاب");
    expect(html).toContain("https://donate.lapnomba.org/og/collecte/equipment.jpg");
    expect(html).toContain("https://donate.lapnomba.org/material?lang=ar");
  });

  it("page inconnue → page de don", () => {
    expect(run("xyz", { lang: "en" })).toContain("Donate — Lap Nomba Foundation");
  });
});
