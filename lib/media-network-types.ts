// Shared types/constants for media networks (safe for client components)

import type { MediaItem } from "@/lib/media-data";
import {
  mediaItemDetailPath,
  mediaPublicSlug,
  shouldRedirectMediaIdToSlug,
  isMediaCuid,
} from "@/lib/media-slug";

export {
  mediaItemDetailPath,
  mediaPublicSlug,
  shouldRedirectMediaIdToSlug,
  isMediaCuid,
};

export const NETWORK_CATALOG_ID_PREFIX = "nw_";

export const NETWORK_TYPE_CODES = [
  "bus_shelter",
  "apartment",
  "subway_pillar",
  "convenience_store",
  "golf_course",
  "highway_rest",
] as const;

export type NetworkTypeCode = (typeof NETWORK_TYPE_CODES)[number];

export const NETWORK_TYPE_LABELS: Record<string, { ko: string; en: string }> = {
  bus_shelter: { ko: "버스 정류장", en: "Bus shelter" },
  apartment: { ko: "아파트", en: "Apartment" },
  subway_pillar: { ko: "지하철 기둥", en: "Subway pillar" },
  convenience_store: { ko: "편의점 앞", en: "Convenience store" },
  golf_course: { ko: "골프장", en: "Golf course" },
  highway_rest: { ko: "고속도로 휴게소", en: "Highway rest area" },
};

export type NetworkPackageTier = { units: number; price: number };

export function networkCatalogId(rawId: string): string {
  return rawId.startsWith(NETWORK_CATALOG_ID_PREFIX)
    ? rawId
    : `${NETWORK_CATALOG_ID_PREFIX}${rawId}`;
}

export function parseNetworkRawId(catalogId: string): string | null {
  if (!catalogId.startsWith(NETWORK_CATALOG_ID_PREFIX)) return null;
  const rest = catalogId.slice(NETWORK_CATALOG_ID_PREFIX.length);
  return rest.length > 0 ? rest : null;
}

export function inferRegionCodeFromLabels(labels: string[]): string {
  const j = labels.join(" ");
  if (/부산/.test(j)) return "busan";
  if (/제주/.test(j)) return "jeju";
  if (/서울|경기|인천|수도권/.test(j)) return "seoul";
  return "national";
}

export function parsePackageOptions(raw: unknown): NetworkPackageTier[] {
  if (!Array.isArray(raw)) return [];
  const out: NetworkPackageTier[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const units = Math.round(Number(o.units));
    const price = Math.round(Number(o.price));
    if (Number.isFinite(units) && units > 0 && Number.isFinite(price) && price >= 0) {
      out.push({ units, price });
    }
  }
  out.sort((a, b) => a.units - b.units);
  return out;
}

export function defaultDisplayMonthlyPrice(n: {
  pricePackage: number | null;
  pricePerUnit: number | null;
  minUnits: number;
  packageOptions: unknown;
}): number {
  const tiers = parsePackageOptions(n.packageOptions);
  if (tiers.length > 0) return tiers[0].price;
  if (n.pricePackage != null && n.pricePackage > 0) return n.pricePackage;
  const u = Math.max(1, n.minUnits);
  const p = n.pricePerUnit;
  if (p != null && p > 0) return p * u;
  return 0;
}

export function computeNetworkMonthlyPrice(
  n: {
    pricePackage: number | null;
    pricePerUnit: number | null;
    minUnits: number;
    packageOptions: unknown;
  },
  units: number,
): number {
  const u = Math.max(n.minUnits, Math.round(units) || n.minUnits);
  const tiers = parsePackageOptions(n.packageOptions);
  if (tiers.length > 0) {
    let best = tiers[0];
    for (const t of tiers) {
      if (t.units <= u && t.units >= best.units) best = t;
    }
    const exact = tiers.find((t) => t.units === u);
    if (exact) return exact.price;
    const higher = tiers.find((t) => t.units >= u);
    if (higher) return higher.price;
    return tiers[tiers.length - 1].price;
  }
  if (n.pricePerUnit != null && n.pricePerUnit > 0) {
    return n.pricePerUnit * u;
  }
  if (n.pricePackage != null && n.pricePackage > 0) {
    return n.pricePackage;
  }
  return 0;
}

export function computeNetworkMonthlyFromMediaItem(
  m: MediaItem,
  units: number,
): number {
  if (m.catalogSource !== "network") return m.price;
  return computeNetworkMonthlyPrice(
    {
      pricePackage: m.networkPricePackage ?? null,
      pricePerUnit: m.networkPricePerUnit ?? null,
      minUnits: m.networkMinUnits ?? 1,
      packageOptions: m.networkPackageTiers ?? null,
    },
    units,
  );
}
