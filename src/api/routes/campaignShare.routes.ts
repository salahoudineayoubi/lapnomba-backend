import { Request, Response, Router } from "express";
import { CrowdfundingCampaignModel } from "../../models/crowdfunding_campaign";
import { LocalizedText } from "../../models/testimonial";
import { pickLocalizedText } from "../../services/campaignTranslation";
import logger from "../../utils/logger";

/**
 * Aperçus de partage des collectes (WhatsApp, Facebook, X, LinkedIn, Telegram…).
 *
 * Le site de dons est une SPA : les robots des réseaux sociaux n'exécutent pas
 * le JavaScript et ne voient donc que les balises génériques de index.html.
 * Cette route renvoie une petite page HTML avec les balises Open Graph /
 * Twitter de LA collecte (titre, extrait de l'histoire, image de couverture),
 * puis redirige immédiatement les humains vers la page de la collecte.
 *
 *   GET /share/collecte/:slug   (alias court : /s/c/:slug)
 *   ?lang=fr|en|tr|ar           (facultatif, langue des textes de repli)
 */

const DEFAULT_DONATE_SITE_URL = "https://donate.lapnomba.org";
const SITE_NAME = "Lap Nomba Foundation";
const DESCRIPTION_MAX = 180;
const SLUG_RE = /^[A-Za-z0-9_-]{1,160}$/;

/** Couvertures proposées par le site (« preset:<id> ») → JPEG 1200×630 servis par le site de dons. */
export const PRESET_COVER_IDS = ["laptop", "training", "students", "coding", "despair", "stopzaguina", "awareness", "field", "youth", "equipment"] as const;

type Lang = "fr" | "en" | "tr" | "ar";

const TEXTS: Record<Lang, { support: string; fallbackDescription: string; redirect: string; notFoundTitle: string; notFoundDescription: string; ogLocale: string }> = {
  fr: {
    support: "Soutenez cette collecte",
    fallbackDescription: "Soutenez cette collecte solidaire : les dons vont directement à la Lap Nomba Foundation.",
    redirect: "Redirection vers la collecte…",
    notFoundTitle: "Collecte introuvable",
    notFoundDescription: "Découvrez les collectes solidaires de la Lap Nomba Foundation.",
    ogLocale: "fr_FR",
  },
  en: {
    support: "Support this fundraiser",
    fallbackDescription: "Support this fundraiser: donations go directly to the Lap Nomba Foundation.",
    redirect: "Redirecting to the fundraiser…",
    notFoundTitle: "Fundraiser not found",
    notFoundDescription: "Discover the Lap Nomba Foundation fundraisers.",
    ogLocale: "en_US",
  },
  tr: {
    support: "Bu bağış kampanyasını destekleyin",
    fallbackDescription: "Bu bağış kampanyasını destekleyin: bağışlar doğrudan Lap Nomba Foundation'a gider.",
    redirect: "Kampanyaya yönlendiriliyorsunuz…",
    notFoundTitle: "Kampanya bulunamadı",
    notFoundDescription: "Lap Nomba Foundation bağış kampanyalarını keşfedin.",
    ogLocale: "tr_TR",
  },
  ar: {
    support: "ادعم حملة التبرع هذه",
    fallbackDescription: "ادعم حملة التبرع هذه: تذهب التبرعات مباشرة إلى Lap Nomba Foundation.",
    redirect: "جارٍ التوجيه إلى الحملة…",
    notFoundTitle: "الحملة غير موجودة",
    notFoundDescription: "اكتشف حملات التبرع لدى Lap Nomba Foundation.",
    ogLocale: "ar_AR",
  },
};

const pickLang = (value: unknown): Lang => {
  const v = typeof value === "string" ? value.slice(0, 2).toLowerCase() : "";
  return v === "en" || v === "tr" || v === "ar" ? v : "fr";
};

/** Échappement HTML (contenu et attributs). */
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Texte brut sur une ligne, tronqué proprement (sans couper un mot si possible). */
export const toPlainExcerpt = (text: string | undefined | null, max = DESCRIPTION_MAX): string => {
  if (!text) return "";
  const plain = String(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?-]+$/, "")}…`;
};

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");

export const getDonateSiteUrl = (): string => {
  const raw = (process.env.DONATE_SITE_URL || "").trim();
  return /^https?:\/\//i.test(raw) ? stripTrailingSlash(raw) : DEFAULT_DONATE_SITE_URL;
};

/**
 * Racine publique du backend pour og:url / canonical / images /uploads.
 * Priorité à l'adresse RÉELLEMENT appelée par le robot (elle fonctionne
 * forcément) : APP_BASE_URL peut pointer vers un domaine sans DNS
 * (ex. api.lapnomba.org), ce qui cassait l'aperçu Facebook/WhatsApp.
 */
const getApiBaseUrl = (req?: Request): string => {
  const host = req?.get?.("x-forwarded-host") || req?.get?.("host");
  if (host && /^[a-z0-9.-]+(:\d+)?$/i.test(host)) {
    const forwarded = (req?.get?.("x-forwarded-proto") || "").split(",")[0].trim();
    const proto = forwarded || (/^(localhost|127\.)/.test(host) ? req?.protocol || "http" : "https");
    return `${proto}://${host}`;
  }
  const raw = (process.env.APP_BASE_URL || "").trim();
  if (/^https?:\/\//i.test(raw)) return stripTrailingSlash(raw);
  return "https://lobster-app-vdl5o.ondigitalocean.app";
};

export type ShareImage = { url: string; width?: number; height?: number; type?: string };

/**
 * URL ABSOLUE de l'image de partage d'une collecte :
 *  - « preset:<id> » → https://donate.lapnomba.org/og/collecte/<id>.jpg (JPEG 1200×630, < 100 Ko)
 *  - URL https absolue (ex. Cloudinary) → telle quelle
 *  - chemin /uploads/… → servi par ce backend
 *  - rien / ancienne URL de build webpack (/static/media/…) → image par défaut du site
 */
/** Même règle que le site de dons (covers/index.ts) : image adaptée au titre. */
export const coverIdForTitle = (title?: string | null): string => {
  const t = (title || "").toLowerCase();
  if (/ordinateur|laptop|computer|\bpc\b|matériel|materiel|équipement|equipement|bilgisayar|حاسوب|كمبيوتر/.test(t)) return "laptop";
  // Avant « zaguina » : « De Zaguina à Lap Nomba : construisez l'avenir… » ≠ « Sortir les jeunes du Zaguina… ».
  if (/avenir|future|construi|codez|coder|\bcode\b|développeur|developpeur|developer|formation|former\b|training/.test(t)) return "coding";
  if (/zaguina|désespo|desespo|arnaque|scam/.test(t)) return "despair";
  if (/sensibilis|awareness|prévention|prevention|école|ecole|school|étudiant|etudiant|élève|eleve/.test(t)) return "students";
  if (/numérique|numerique|digital|tech/.test(t)) return "coding";
  return "training";
};

export const resolveShareImage = (coverImage: string | undefined | null, req?: Request, title?: string | null): ShareImage => {
  const donate = getDonateSiteUrl();
  const fallback: ShareImage = { url: `${donate}/og-donate.jpg`, width: 1200, height: 630, type: "image/jpeg" };
  let value = (coverImage || "").trim();
  // Pas d'image choisie (ou ancienne image par défaut identique partout) : image adaptée au titre.
  if (!value || value === "preset:awareness" || value.startsWith("/static/media/")) value = `preset:${coverIdForTitle(title)}`;

  if (value.startsWith("preset:")) {
    const id = value.slice("preset:".length);
    return (PRESET_COVER_IDS as readonly string[]).includes(id)
      ? { url: `${donate}/og/collecte/${id}.jpg`, width: 1200, height: 630, type: "image/jpeg" }
      : fallback;
  }
  if (/^https:\/\//i.test(value)) return { url: value };
  if (value.startsWith("/uploads/")) return { url: `${getApiBaseUrl(req)}${value}` };
  return fallback;
};

/**
 * Robots d'aperçu de liens. Ils reçoivent la page SANS redirection : Facebook
 * (et LinkedIn) suivent les « meta refresh » et og:url, et liraient sinon les
 * balises génériques de la SPA.
 */
export const LINK_PREVIEW_BOT_RE =
  /facebookexternalhit|facebookcatalog|meta-externalagent|whatsapp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|skypeuripreview|pinterest|redditbot|applebot|googlebot|bingbot|vkshare|embedly|iframely|quora link preview|outbrain|w3c_validator|bot|crawler|spider|preview/i;

export const isLinkPreviewBot = (userAgent: string | undefined): boolean => !!userAgent && LINK_PREVIEW_BOT_RE.test(userAgent);

type PageInput = {
  lang: Lang;
  title: string;
  description: string;
  /** Page de la collecte sur le site de dons (destination des humains). */
  pageUrl: string;
  /** URL de cet aperçu (og:url / canonical) : les robots ne vont pas lire la SPA. */
  shareUrl: string;
  image: ShareImage;
  imageAlt: string;
  /** false pour les robots : pas de meta refresh. */
  redirect: boolean;
};

export const renderSharePage = ({ lang, title, description, pageUrl, shareUrl, image, imageAlt, redirect }: PageInput): string => {
  const t = TEXTS[lang];
  const e = escapeHtml;
  const imageMeta = [
    `<meta property="og:image" content="${e(image.url)}">`,
    image.url.startsWith("https://") ? `<meta property="og:image:secure_url" content="${e(image.url)}">` : "",
    image.type ? `<meta property="og:image:type" content="${e(image.type)}">` : "",
    image.width ? `<meta property="og:image:width" content="${image.width}">` : "",
    image.height ? `<meta property="og:image:height" content="${image.height}">` : "",
    `<meta property="og:image:alt" content="${e(imageAlt)}">`,
  ]
    .filter(Boolean)
    .join("\n");

  // JSON.stringify + échappement de « < » : aucune sortie possible du <script>.
  const jsUrl = JSON.stringify(pageUrl).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="${lang}"${lang === "ar" ? ' dir="rtl"' : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(description)}">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${e(shareUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="${t.ogLocale}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${e(shareUrl)}">
${imageMeta}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(title)}">
<meta name="twitter:description" content="${e(description)}">
<meta name="twitter:image" content="${e(image.url)}">
<meta name="twitter:image:alt" content="${e(imageAlt)}">
${redirect ? `<meta http-equiv="refresh" content="0; url=${e(pageUrl)}">\n` : ""}<script>window.location.replace(${jsUrl});</script>
</head>
<body>
<p><a href="${e(pageUrl)}">${e(t.redirect)}</a></p>
</body>
</html>`;
};

const sendHtml = (res: Response, status: number, html: string, cacheable = true) => {
  res
    .status(status)
    .set({
      "Content-Type": "text/html; charset=utf-8",
      // 5 min : une collecte modifiée/traduite apparaît vite dans les aperçus.
      "Cache-Control": cacheable ? "public, max-age=300" : "no-store",
      "X-Content-Type-Options": "nosniff",
    })
    .send(html);
};

export const campaignShareHandler = async (req: Request, res: Response) => {
  const lang = pickLang(req.query.lang);
  const t = TEXTS[lang];
  const donate = getDonateSiteUrl();
  const listUrl = `${donate}/collecte`;
  const slug = typeof req.params.slug === "string" ? req.params.slug.trim() : "";
  const redirect = !isLinkPreviewBot(req.get("user-agent"));
  const langQuery = lang === "fr" ? "" : `?lang=${lang}`;
  // Langue choisie par la personne qui partage : le site s'ouvre dans cette langue.
  const explicitLang = typeof req.query.lang === "string" && req.query.lang ? `?lang=${lang}` : "";
  const shareUrlFor = (s: string) => `${getApiBaseUrl(req)}/share/collecte/${encodeURIComponent(s)}${langQuery}`;

  const notFound = () =>
    sendHtml(
      res,
      404,
      renderSharePage({
        lang,
        title: `${t.notFoundTitle} | ${SITE_NAME}`,
        description: t.notFoundDescription,
        pageUrl: listUrl,
        shareUrl: listUrl,
        image: resolveShareImage(undefined, req),
        imageAlt: SITE_NAME,
        redirect,
      })
    );

  if (!SLUG_RE.test(slug)) return notFound();

  try {
    const campaign = await CrowdfundingCampaignModel.findOne({ slug })
      .select("title slug story coverImage originalLanguage titleI18n storyI18n")
      .lean<{
        title: string;
        slug: string;
        story?: string;
        coverImage?: string;
        originalLanguage?: string;
        titleI18n?: LocalizedText;
        storyI18n?: LocalizedText;
      }>();

    if (!campaign) return notFound();

    // Texte dans la langue du partage (traduction → original → en → fr).
    const localizedTitle = pickLocalizedText(campaign.title, campaign.titleI18n, lang, campaign.originalLanguage);
    const localizedStory = pickLocalizedText(campaign.story, campaign.storyI18n, lang, campaign.originalLanguage);
    const title = toPlainExcerpt(localizedTitle, 120) || t.support;
    const description = toPlainExcerpt(localizedStory) || t.fallbackDescription;

    return sendHtml(
      res,
      200,
      renderSharePage({
        lang,
        title: `${title} — ${t.support}`,
        description,
        pageUrl: `${donate}/collecte/${encodeURIComponent(campaign.slug)}${explicitLang}`,
        shareUrl: shareUrlFor(campaign.slug),
        image: resolveShareImage(campaign.coverImage, req, campaign.title),
        imageAlt: title,
        redirect,
      })
    );
  } catch (err: any) {
    logger.error("Aperçu de partage de collecte indisponible", { error: err?.message });
    // Repli : on redirige quand même vers la collecte, avec l'aperçu générique.
    return sendHtml(
      res,
      200,
      renderSharePage({
        lang,
        title: `${t.support} | ${SITE_NAME}`,
        description: t.fallbackDescription,
        pageUrl: `${donate}/collecte/${encodeURIComponent(slug)}`,
        shareUrl: shareUrlFor(slug),
        image: resolveShareImage(undefined, req),
        imageAlt: SITE_NAME,
        redirect,
      }),
      false
    );
  }
};

type PageKey = "material" | "donate" | "collectes";
const PAGES: Record<PageKey, { path: string; image: string; texts: Record<Lang, { title: string; description: string }> }> = {
  material: {
    path: "/material",
    image: "equipment",
    texts: {
      fr: { title: "Donnez un ordinateur à un jeune — Lap Nomba Foundation", description: "Ordinateurs, tablettes, accessoires : votre matériel équipe des jeunes formés aux métiers du numérique au Cameroun." },
      en: { title: "Give a computer to a young person — Lap Nomba Foundation", description: "Laptops, tablets, accessories: your equipment helps young people train for tech careers in Cameroon." },
      tr: { title: "Bir gence bilgisayar bağışlayın — Lap Nomba Foundation", description: "Dizüstü bilgisayar, tablet, aksesuar: bağışladığınız ekipman Kamerun'da dijital mesleklere hazırlanan gençleri donatır." },
      ar: { title: "تبرّع بحاسوب لشاب — Lap Nomba Foundation", description: "حواسيب، أجهزة لوحية، ملحقات: معداتك تجهّز شبابًا يتدربون على المهن الرقمية في الكاميرون." },
    },
  },
  donate: {
    path: "/",
    image: "laptop",
    texts: {
      fr: { title: "Faites un don — Lap Nomba Foundation", description: "Aidez les jeunes à sortir du Zaguina : vos dons financent des formations gratuites aux métiers du numérique." },
      en: { title: "Donate — Lap Nomba Foundation", description: "Help young people leave Zaguina: your donations fund free training for tech careers." },
      tr: { title: "Bağış yapın — Lap Nomba Foundation", description: "Gençlerin Zaguina'dan çıkmasına yardım edin: bağışlarınız ücretsiz dijital meslek eğitimlerini finanse eder." },
      ar: { title: "تبرّع — Lap Nomba Foundation", description: "ساعد الشباب على الخروج من الزاغينا: تبرعاتك تموّل تدريبات مجانية على المهن الرقمية." },
    },
  },
  collectes: {
    path: "/collecte",
    image: "training",
    texts: {
      fr: { title: "Collectes solidaires — Lap Nomba Foundation", description: "Soutenez une collecte ou lancez la vôtre pour la formation des jeunes au Cameroun." },
      en: { title: "Fundraisers — Lap Nomba Foundation", description: "Support a fundraiser or start your own for young people's training in Cameroon." },
      tr: { title: "Bağış kampanyaları — Lap Nomba Foundation", description: "Kamerun'daki gençlerin eğitimi için bir kampanyayı destekleyin ya da kendi kampanyanızı başlatın." },
      ar: { title: "حملات التبرع — Lap Nomba Foundation", description: "ادعم حملة أو أطلق حملتك الخاصة لتدريب الشباب في الكاميرون." },
    },
  },
};

export const pageShareHandler = (req: Request, res: Response) => {
  const lang = pickLang(req.query.lang);
  const key = (req.params.page || "") as PageKey;
  const page = PAGES[key] ?? PAGES.donate;
  const donate = getDonateSiteUrl();
  const explicitLang = typeof req.query.lang === "string" && req.query.lang ? `?lang=${lang}` : "";
  const langQuery = lang === "fr" ? "" : `?lang=${lang}`;
  const { title, description } = page.texts[lang];
  return sendHtml(
    res,
    200,
    renderSharePage({
      lang,
      title,
      description,
      pageUrl: `${donate}${page.path}${explicitLang}`,
      shareUrl: `${getApiBaseUrl(req)}/share/page/${PAGES[key] ? key : "donate"}${langQuery}`,
      image: { url: `${donate}/og/collecte/${page.image}.jpg`, width: 1200, height: 630, type: "image/jpeg" },
      imageAlt: title,
      redirect: !isLinkPreviewBot(req.get("user-agent")),
    })
  );
};

const router = Router();
router.get(["/share/collecte/:slug", "/s/c/:slug"], campaignShareHandler);
router.get(["/share/page/:page", "/s/p/:page"], pageShareHandler);

export default router;
