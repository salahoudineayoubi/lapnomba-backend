import mongoose from "mongoose";
import { SITE_SETTINGS_KEY, SiteSettingsModel } from "../models/siteSettings";
import { normalizeSupportWhatsapp, tryNormalizeSupportWhatsapp } from "../utils/supportWhatsapp";

/**
 * Cache en mémoire des paramètres du site (document SiteSettings unique).
 *
 * - getSupportContact() (utils/emailSupport.ts) est synchrone et utilisé par
 *   les e-mails, le reçu PDF et Pemi AI : il lit ce cache, jamais la base.
 * - Le cache est chargé au démarrage (app.ts), mis à jour immédiatement par
 *   updateSiteSettings, et rafraîchi en arrière-plan quand il a plus de
 *   SITE_SETTINGS_TTL_MS (utile si plusieurs instances tournent).
 * - Base vide, indisponible ou valeur invalide : le cache reste vide (ou garde
 *   la dernière valeur connue) et getSupportContact retombe sur
 *   SUPPORT_WHATSAPP (env) puis sur le numéro par défaut.
 */
export const SITE_SETTINGS_TTL_MS = 60 * 1000;

type CacheState = {
  /** null = aucune valeur en base (ou jamais chargée). */
  supportWhatsapp: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  loadedAt: number;
};

const emptyState = (): CacheState => ({ supportWhatsapp: null, updatedAt: null, updatedBy: null, loadedAt: 0 });

let cache: CacheState = emptyState();
let inflight: Promise<void> | null = null;

const isDbConnected = () => mongoose.connection?.readyState === 1;

/** Numéro WhatsApp en base (chiffres) si chargé, sinon null. */
export const getCachedSupportWhatsapp = (): string | null => cache.supportWhatsapp;

export const getCachedSiteSettingsMeta = () => ({ updatedAt: cache.updatedAt, updatedBy: cache.updatedBy });

/**
 * Recharge le cache depuis la base. Ne lève jamais : en cas d'échec, la
 * dernière valeur connue est conservée (le prochain appel réessaiera).
 */
export const refreshSiteSettingsCache = (): Promise<void> => {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const doc: any = await SiteSettingsModel.findOne({ key: SITE_SETTINGS_KEY }).lean();
      cache = {
        supportWhatsapp: tryNormalizeSupportWhatsapp(doc?.supportWhatsapp),
        updatedAt: doc?.updatedAt ? new Date(doc.updatedAt) : null,
        updatedBy: doc?.updatedBy || null,
        loadedAt: Date.now(),
      };
    } catch (error: any) {
      // Réessai au plus tard après un TTL ; dernière valeur connue conservée.
      cache = { ...cache, loadedAt: Date.now() };
      console.warn("SiteSettings : lecture impossible, valeur de secours utilisée —", error?.message || error);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
};

const isStale = () => Date.now() - cache.loadedAt > SITE_SETTINGS_TTL_MS;

/**
 * Rafraîchissement non bloquant, pour les appels synchrones : déclenché
 * seulement si le cache est périmé ET la connexion Mongo ouverte (jamais de
 * requête mise en attente sans base, ex. dans les tests).
 */
export const refreshSiteSettingsInBackground = (): void => {
  if (!isStale() || !isDbConnected()) return;
  void refreshSiteSettingsCache();
};

/** Garantit un cache à jour (pour la requête publique siteSettings). */
export const ensureSiteSettingsFresh = async (): Promise<void> => {
  if (!isStale() || !isDbConnected()) return;
  await refreshSiteSettingsCache();
};

/** Valide, enregistre et met le cache à jour immédiatement. */
export const updateSiteSettings = async (input: { supportWhatsapp?: unknown }, updatedBy?: string | null) => {
  const supportWhatsapp = normalizeSupportWhatsapp(input?.supportWhatsapp);
  const doc: any = await SiteSettingsModel.findOneAndUpdate(
    { key: SITE_SETTINGS_KEY },
    { $set: { supportWhatsapp, ...(updatedBy ? { updatedBy } : {}) } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  cache = {
    supportWhatsapp,
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt) : new Date(),
    updatedBy: doc?.updatedBy || updatedBy || null,
    loadedAt: Date.now(),
  };
  return cache;
};

/** Tests uniquement. */
export const __resetSiteSettingsCacheForTests = () => {
  cache = emptyState();
  inflight = null;
};
