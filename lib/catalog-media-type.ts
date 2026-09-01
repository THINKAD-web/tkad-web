/**
 * Public catalog physical media type — DB `Media.type` SSOT.
 *
 * PR0: `digital` (전자게시대 OOH) retired → `dooh`.
 * Online ads (`online`) arrive in PR1 — not a catalog media type here.
 */

export const CATALOG_MEDIA_TYPE_DOOH = "dooh" as const;
export const CATALOG_MEDIA_TYPE_STATIC = "static" as const;
export const CATALOG_MEDIA_TYPE_MOBILE = "mobile" as const;

export const CATALOG_MEDIA_TYPES = [
  CATALOG_MEDIA_TYPE_DOOH,
  CATALOG_MEDIA_TYPE_STATIC,
  CATALOG_MEDIA_TYPE_MOBILE,
] as const;

export type CatalogMediaType = (typeof CATALOG_MEDIA_TYPES)[number];

/**
 * Legacy URL/query alias — remove after 2027-03-01.
 * @deprecated Use `dooh`. Parsed only at input boundaries.
 */
export const LEGACY_CATALOG_MEDIA_TYPE_ALIASES: Readonly<
  Record<string, CatalogMediaType>
> = {
  digital: CATALOG_MEDIA_TYPE_DOOH,
};

const TYPE_SET = new Set<string>(CATALOG_MEDIA_TYPES);

/** Legacy `digital` alias hits since process start — remove alias when 0/month. */
let legacyDigitalAliasHitCount = 0;

export function getLegacyCatalogMediaTypeAliasHitCount(): number {
  return legacyDigitalAliasHitCount;
}

function recordLegacyDigitalAliasHit(raw: string): void {
  legacyDigitalAliasHitCount += 1;
  if (process.env.NODE_ENV === "test") return;
  console.info("[catalog-media-type] legacy alias digital→dooh", {
    raw,
    hits: legacyDigitalAliasHitCount,
  });
}

export function isValidCatalogMediaType(v: string): v is CatalogMediaType {
  return TYPE_SET.has(v.trim().toLowerCase());
}

/** Normalize raw input (DB row, query param, API body) to canonical type or null. */
export function normalizeCatalogMediaType(
  raw: string | null | undefined,
): CatalogMediaType | null {
  if (raw == null) return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  const aliased = LEGACY_CATALOG_MEDIA_TYPE_ALIASES[v];
  if (aliased) {
    recordLegacyDigitalAliasHit(v);
    return aliased;
  }
  if (isValidCatalogMediaType(v)) return v;
  return null;
}

/** Canonical type for persistence — never writes legacy alias. */
export function canonicalCatalogMediaType(
  raw: string | null | undefined,
  fallback: CatalogMediaType = CATALOG_MEDIA_TYPE_DOOH,
): CatalogMediaType {
  return normalizeCatalogMediaType(raw) ?? fallback;
}

export function isCatalogDoohType(type: string | null | undefined): boolean {
  return normalizeCatalogMediaType(type) === CATALOG_MEDIA_TYPE_DOOH;
}
