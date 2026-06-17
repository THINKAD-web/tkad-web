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
  "campus_kiosk",
  "subway_station",
  "elevator",
  "shopping_mall",
  "bookstore",
  "office",
  "hospital",
] as const;

export type NetworkTypeCode = (typeof NETWORK_TYPE_CODES)[number];

export const NETWORK_TYPE_LABELS: Record<string, { ko: string; en: string }> = {
  bus_shelter: { ko: "버스 정류장", en: "Bus shelter" },
  apartment: { ko: "아파트", en: "Apartment" },
  subway_pillar: { ko: "지하철 기둥", en: "Subway pillar" },
  convenience_store: { ko: "편의점 앞", en: "Convenience store" },
  golf_course: { ko: "골프장", en: "Golf course" },
  highway_rest: { ko: "고속도로 휴게소", en: "Highway rest area" },
  campus_kiosk: { ko: "대학 캠퍼스 키오스크", en: "Campus kiosk" },
  subway_station: { ko: "지하철 역사 광고판", en: "Subway station ads" },
  elevator: { ko: "건물/오피스 엘리베이터", en: "Building elevator" },
  shopping_mall: { ko: "쇼핑몰/백화점 디지털 사이니지", en: "Shopping mall DOOH" },
  bookstore: { ko: "교보문고·서점", en: "Bookstore" },
  office: { ko: "오피스·빌딩", en: "Office building" },
  hospital: { ko: "병원·의료", en: "Hospital" },
};

/** `/media/network` 목록 필터 칩 (대표 유형) */
export const NETWORK_BROWSE_TYPE_CHIPS = [
  { value: "", labelKo: "전체", labelEn: "All", icon: "Network" },
  { value: "campus_kiosk", labelKo: "대학교", labelEn: "Campus", icon: "GraduationCap" },
  { value: "convenience_store", labelKo: "편의점", labelEn: "Convenience", icon: "Coffee" },
  { value: "elevator", labelKo: "엘리베이터", labelEn: "Elevator", icon: "Building2" },
  { value: "bookstore", labelKo: "교보문고", labelEn: "Bookstore", icon: "Landmark" },
  { value: "office", labelKo: "오피스", labelEn: "Office", icon: "Building2" },
  { value: "hospital", labelKo: "병원", labelEn: "Hospital", icon: "Landmark" },
  { value: "apartment", labelKo: "아파트", labelEn: "Apartment", icon: "Building2" },
  { value: "bus_shelter", labelKo: "버스쉘터", labelEn: "Bus shelter", icon: "MapPin" },
  { value: "subway_station", labelKo: "지하철", labelEn: "Subway", icon: "Train" },
  { value: "shopping_mall", labelKo: "쇼핑몰", labelEn: "Mall", icon: "ShoppingBag" },
] as const;

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

/**
 * units 없이 price 만 있는 패키지 옵션도 가격으로 인식(헤드라인 표시용).
 * parsePackageOptions 는 tier 계산용이라 units>0 을 강제하지만, 가격 표시에서는
 * units 누락 데이터까지 살려야 ₩0 폴백을 막을 수 있다. 가격 오름차순 반환.
 */
export function loosePackagePrices(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const price = Math.round(Number((x as Record<string, unknown>).price));
    if (Number.isFinite(price) && price > 0) out.push(price);
  }
  return out.sort((a, b) => a - b);
}

export function defaultDisplayMonthlyPrice(n: {
  pricePackage: number | null;
  pricePerUnit: number | null;
  minUnits: number;
  packageOptions: unknown;
}): number {
  const tiers = parsePackageOptions(n.packageOptions);
  if (tiers.length > 0) return tiers[0].price;
  // 패키지 우선: units 없는 packageOptions·pricePackage 를 pricePerUnit 보다 먼저 사용
  const loose = loosePackagePrices(n.packageOptions);
  if (loose.length > 0) return loose[0];
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
