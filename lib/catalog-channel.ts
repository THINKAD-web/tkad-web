/**
 * Catalog channel axis — DB `Media.catalog_channel` SSOT.
 *
 * Separates offline OOH catalog from online ads (PR1b). PR1a: all rows `offline`.
 */

export const CATALOG_CHANNEL_OFFLINE = "offline" as const;
export const CATALOG_CHANNEL_ONLINE = "online" as const;

export const CATALOG_CHANNELS = [
  CATALOG_CHANNEL_OFFLINE,
  CATALOG_CHANNEL_ONLINE,
] as const;

export type CatalogChannel = (typeof CATALOG_CHANNELS)[number];

const CHANNEL_SET = new Set<string>(CATALOG_CHANNELS);

export function isValidCatalogChannel(v: string): v is CatalogChannel {
  return CHANNEL_SET.has(v.trim().toLowerCase());
}

export function normalizeCatalogChannel(
  raw: string | null | undefined,
): CatalogChannel | null {
  if (raw == null) return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  return isValidCatalogChannel(v) ? v : null;
}

export function canonicalCatalogChannel(
  raw: string | null | undefined,
  fallback: CatalogChannel = CATALOG_CHANNEL_OFFLINE,
): CatalogChannel {
  return normalizeCatalogChannel(raw) ?? fallback;
}

/** Browse mains that map to online catalog (PR1b); mirrors forward SQL map. */
const ONLINE_BROWSE_MAINS = new Set(["digital", "online"]);

/**
 * NULL-main → offline fallback hits since process start.
 * PR0 `getLegacyCatalogMediaTypeAliasHitCount()` 패턴 — 운영에서 이 경로 빈도 관측용.
 */
let nullMainCatalogChannelFallbackHitCount = 0;

export function getNullMainCatalogChannelFallbackHitCount(): number {
  return nullMainCatalogChannelFallbackHitCount;
}

function recordNullMainCatalogChannelFallback(input: {
  mediaMainCategory?: string | null;
  catalogChannel?: string | null;
}): void {
  nullMainCatalogChannelFallbackHitCount += 1;
  if (process.env.NODE_ENV === "test") return;
  console.info("[catalog-channel] null-main fallback → offline", {
    mediaMainCategory: input.mediaMainCategory ?? null,
    catalogChannel: input.catalogChannel ?? null,
    hits: nullMainCatalogChannelFallbackHitCount,
  });
}

/**
 * Resolve `catalog_channel` on media create when the column is NOT NULL.
 *
 * TODO(PR1b redesign — trigger condition, not calendar):
 * Once **any** row exists with `catalog_channel='online'`, this fallback is **unsafe**:
 * admin can register online inventory without browse main and it silently lands in the
 * offline catalog (integrated planner budget + PricingStrategy branch skew, no UI signal).
 * Redesign before or as part of online catalog launch — e.g. require browse main,
 * explicit channel input, or reject create when main is NULL and online is live.
 *
 * Backfill (forward SQL) rejects unmapped mains via EXCEPTION; write path intentionally
 * defaults NULL main → offline for admin UX until online exists (0 rows today).
 */
export function resolveCatalogChannelForMediaWrite(input: {
  catalogChannel?: string | null;
  mediaMainCategory?: string | null;
}): CatalogChannel {
  const explicit = normalizeCatalogChannel(input.catalogChannel);
  if (explicit) return explicit;
  const main = input.mediaMainCategory?.trim().toLowerCase();
  if (main && ONLINE_BROWSE_MAINS.has(main)) return CATALOG_CHANNEL_ONLINE;
  if (!main) {
    recordNullMainCatalogChannelFallback(input);
  }
  return CATALOG_CHANNEL_OFFLINE;
}

/** Browse / UI labels — not legacy bare 「디지털」 */
export const CATALOG_CHANNEL_LABELS: Record<
  CatalogChannel,
  { ko: string; en: string }
> = {
  offline: { ko: "옥외광고", en: "Out-of-home" },
  online: { ko: "온라인 광고", en: "Online ads" },
};
