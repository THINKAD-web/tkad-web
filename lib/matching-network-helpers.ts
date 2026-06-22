import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToPriceMan, catalogPriceFieldToWon } from "@/lib/media-price-format";
import { mediaRegionHaystack } from "@/lib/media-region-haystack";
import {
  computeNetworkMonthlyFromMediaItem,
  NETWORK_CATALOG_ID_PREFIX,
} from "@/lib/media-network-public";

/** 카탈로그 합성 네트워크 매체 여부 */
export function isNetworkCatalogItem(m: MediaItem): boolean {
  return (
    m.catalogSource === "network" ||
    m.type === "network" ||
    m.id.startsWith(NETWORK_CATALOG_ID_PREFIX)
  );
}

/**
 * 매칭·포트폴리오용 네트워크 월 최소 진입가(원).
 * minUnits·패키지 최저 구간 기준 — 전체 패키지가가 아닌 실제 최소 집행 단가.
 */
export function effectiveNetworkEntryMonthlyWon(m: MediaItem): number {
  if (!isNetworkCatalogItem(m)) return 0;
  const minUnits = Math.max(1, m.networkMinUnits ?? 1);
  const fromTiers = computeNetworkMonthlyFromMediaItem(m, minUnits);
  if (fromTiers > 0) return fromTiers;
  const display = catalogPriceFieldToWon(m.price);
  return display > 0 ? display : 0;
}

/** 플래너 knapsack·예산 합계용 월 단가(만원) */
export function plannerMediaMonthlyPriceMan(m: MediaItem): number {
  if (isNetworkCatalogItem(m)) {
    const entry = effectiveNetworkEntryMonthlyWon(m);
    if (entry > 0) return catalogPriceFieldToPriceMan(entry);
  }
  return catalogPriceFieldToPriceMan(m.price);
}

/** 다지점 도달 규모 보너스 (0–6, popularity 슬롯에 합산) */
export function networkReachBonus(m: MediaItem): number {
  if (!isNetworkCatalogItem(m)) return 0;
  const locCount =
    m.networkTotalLocations ??
    m.networkLocations?.length ??
    m.installLocations?.length ??
    0;
  if (locCount >= 500) return 6;
  if (locCount >= 100) return 5;
  if (locCount >= 30) return 4;
  if (locCount >= 10) return 3;
  if (locCount >= 3) return 2;
  if (locCount >= 1) return 1;
  const labels = m.networkRegionLabels?.length ?? 0;
  if (labels >= 3) return 2;
  if (labels >= 1) return 1;
  return 0;
}

const REGION_TOKEN_ALIASES: Record<string, string[]> = {
  seoul: ["서울", "수도권", "seoul"],
  busan: ["부산", "busan"],
  jeju: ["제주", "jeju"],
  gyeonggi: ["경기", "gyeonggi"],
  incheon: ["인천", "incheon"],
  national: ["전국", "national", "nationwide", "수도권"],
};

/** 매칭 입력 지역과 네트워크 지점·라벨 커버리지가 겹치는지 */
export function networkMatchesMatchingRegions(
  m: MediaItem,
  regions: string[],
): boolean {
  if (!isNetworkCatalogItem(m)) return false;
  if (regions.length === 0) return true;

  const hay = mediaRegionHaystack(m);
  for (const raw of regions) {
    const key = raw.trim().toLowerCase();
    if (!key || key === "all" || key === "national") return true;

    const aliases = REGION_TOKEN_ALIASES[key] ?? [raw];
    if (aliases.some((a) => hay.includes(a.toLowerCase()))) return true;
    if (m.region === key || m.regionMain === key) return true;

    for (const label of m.networkRegionLabels ?? []) {
      const l = label.toLowerCase();
      if (aliases.some((a) => l.includes(a.toLowerCase()))) return true;
    }
    for (const loc of m.networkLocations ?? []) {
      if (loc.regionMain?.trim().toLowerCase() === key) return true;
      if (loc.regionSub?.trim().toLowerCase() === key) return true;
    }
  }
  return false;
}

/** 지역 점수 보조 가점 (0–8) — 다지점·다권역 커버 */
export function networkRegionScoreBoost(
  m: MediaItem,
  regions: string[],
): number {
  if (!isNetworkCatalogItem(m)) return 0;
  if (!networkMatchesMatchingRegions(m, regions)) return 0;

  let boost = 3;
  const labelCount = m.networkRegionLabels?.length ?? 0;
  const locCount = m.networkLocations?.length ?? 0;

  if (regions.some((r) => ["national", "all"].includes(r.trim().toLowerCase()))) {
    boost += 2;
  }
  if (labelCount >= 5 || locCount >= 20) boost += 2;
  else if (labelCount >= 2 || locCount >= 5) boost += 1;

  return Math.min(8, boost);
}

/** AI 추천 limit별 네트워크 최소 노출 슬롯 */
export function networkQuotaForLimit(limit: number): number {
  if (limit <= 5) return 1;
  if (limit <= 12) return 1;
  return 2;
}
