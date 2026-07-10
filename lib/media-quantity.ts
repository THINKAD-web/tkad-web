import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToWon, formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { isNetworkCatalogItem } from "@/lib/matching-network-helpers";
import { computeNetworkMonthlyFromMediaItem, networkInventoryUnitSuffix } from "@/lib/media-network-types";

/** 견적 위저드(`quote-page-client`)와 동일한 네트워크 수량 상한 폴백 */
export const MEDIA_QUANTITY_NETWORK_SOFT_MAX = 99_999;

export type MediaQuantityUnitMode = "unit" | "package";

export type MediaPackageOption = {
  /** network: tier units string / media: `opt:${index}` */
  key: string;
  units?: number;
  price: number;
  label: string;
  description?: string;
};

export type MediaQuantityBounds = {
  min: number;
  /** `null` = 상한 없음 (이동형 단일) */
  max: number | null;
  default: number;
};

/** 이동형 단일 매체 — `Media.type === "mobile"` 이고 네트워크 패키지가 아님 */
export function isMobileSingleMedia(m: MediaItem): boolean {
  return m.type?.trim().toLowerCase() === "mobile" && !isNetworkCatalogItem(m);
}

const BROADCAST_PACKAGE_LABEL_RE =
  /회|초|분|시간|slot|sec|min|hour|times?\//i;

function isBusLikeMediaType(m: MediaItem): boolean {
  const type = (m.type ?? "").trim().toLowerCase();
  return type === "mobile" || type === "버스" || type.includes("bus");
}

/**
 * 버스 래핑 등급(SSA/A/B) — `priceOptions[].price` 는 **대당 월 단가**.
 * 수량(대수)은 별도 입력·`×` 곱셈. (어드민 견적·운영 DB와 동일)
 *
 * G버스 등 방송 슬롯 패키지(3회/시간)는 제외 — 옵션가가 월 총액.
 */
export function isPerUnitGradePriceOptions(m: MediaItem): boolean {
  if (isNetworkCatalogItem(m)) return false;
  const opts = m.priceOptions ?? [];
  if (opts.length === 0) return false;
  if (!isBusLikeMediaType(m)) return false;
  const broadcastPackage = opts.every((o) =>
    BROADCAST_PACKAGE_LABEL_RE.test(
      `${o.label} ${o.description ?? ""} ${String(o.period ?? "")}`,
    ),
  );
  return !broadcastPackage;
}

/** 등급형이 아닌 `priceOptions` — 옵션가가 월 패키지 총액 */
export function isPackageTotalPriceOptions(m: MediaItem): boolean {
  if (isNetworkCatalogItem(m)) return false;
  const opts = m.priceOptions ?? [];
  if (opts.length === 0) return false;
  if (isPerUnitGradePriceOptions(m)) return false;
  return getQuantityUnitMode(m) === "package";
}

/**
 * 수량 선택 대상: 네트워크 패키지 + 이동형 단일.
 * 단일 고정(빌보드·전광판 1면 등)은 false.
 */
export function isQuantitySelectableMedia(m: MediaItem): boolean {
  if (isNetworkCatalogItem(m)) return true;
  if ((m.priceOptions?.length ?? 0) > 0) return true;
  return isMobileSingleMedia(m);
}

/** 가격>0 인 네트워크 패키지 tier 만 */
export function getValidNetworkPackageTiers(
  m: MediaItem,
): { units: number; price: number }[] {
  return [...(m.networkPackageTiers ?? [])]
    .filter((t) => t.units > 0 && t.price > 0)
    .sort((a, b) => a.units - b.units);
}

/**
 * 수량 UI 모드.
 * - `package`: tier·priceOptions 중심 (패키지 칩)
 * - `unit`: pricePerUnit·이동형 대수 스텝퍼
 */
export function getQuantityUnitMode(m: MediaItem): MediaQuantityUnitMode {
  if (isNetworkCatalogItem(m)) {
    const tiers = getValidNetworkPackageTiers(m);
    const hasPerUnit = (m.networkPricePerUnit ?? 0) > 0;
    if (tiers.length >= 2) return "package";
    if (tiers.length === 1 && !hasPerUnit) return "package";
    if (hasPerUnit) return "unit";
    if (tiers.length > 0) return "package";
    return "unit";
  }
  if ((m.priceOptions?.length ?? 0) > 0) return "package";
  if (isMobileSingleMedia(m)) return "unit";
  return "unit";
}

/** `networkTotalLocations` 가 샘플 지점 수(재고 상한 아님)인지 */
export function isNetworkTotalLocationsSampleCap(m: MediaItem): boolean {
  const total = m.networkTotalLocations ?? 0;
  if (total <= 0) return false;
  const sampleLocs = m.networkLocations?.length ?? 0;
  if (sampleLocs > 0 && total <= sampleLocs && total <= 10) return true;
  const unitSum = (m.networkLocations ?? []).reduce(
    (s, l) => s + Math.max(1, l.unitCount ?? 1),
    0,
  );
  return total === unitSum && total <= 10 && sampleLocs <= 5;
}

export function getMediaPackageOptions(
  m: MediaItem,
  isKo: boolean,
): MediaPackageOption[] {
  if (isNetworkCatalogItem(m)) {
    return getValidNetworkPackageTiers(m).map((t, i) => ({
      key: `tier:${i}:${t.units}`,
      units: t.units,
      price: t.price,
      label: formatNetworkTierPackageLabel(m, t.units, t.price, isKo),
    }));
  }
  return (m.priceOptions ?? []).map((o, i) => ({
    key: `opt:${i}`,
    units: o.units,
    price: o.price,
    label: o.label,
    description: o.description,
  }));
}

function formatNetworkTierPackageLabel(
  m: MediaItem,
  units: number,
  price: number,
  isKo: boolean,
): string {
  const suffix = networkInventoryUnitSuffix(
    m.networkSubtype ?? m.type,
    isKo,
    m.tags,
  );
  const unitPart = isKo
    ? `${units.toLocaleString("ko-KR")}${suffix || "대"}`
    : `${units.toLocaleString("en-US")} units`;
  const pricePart = formatCatalogPriceFieldWon(price, isKo ? "ko-KR" : "en-US");
  return `${unitPart} · ${pricePart}`;
}

/** 네트워크 매체 수량 표기 접미사 — 플래너·상세 UI 공용 */
export function networkQuantitySuffixForItem(m: MediaItem, isKo: boolean): string {
  if (!isNetworkCatalogItem(m)) return isKo ? "대" : "units";
  if (!isKo) return "units";
  return networkInventoryUnitSuffix(m.networkSubtype ?? m.type, isKo, m.tags) || "대";
}

export function getQuantityBounds(m: MediaItem): MediaQuantityBounds {
  if (isNetworkCatalogItem(m)) {
    const min = Math.max(1, m.networkMinUnits ?? 1);
    const mode = getQuantityUnitMode(m);
    if (mode === "package") {
      const tiers = getValidNetworkPackageTiers(m);
      if (tiers.length > 0) {
        return {
          min: tiers[0]!.units,
          max: tiers[tiers.length - 1]!.units,
          default: tiers[0]!.units,
        };
      }
    }
    const hasPerUnit = (m.networkPricePerUnit ?? 0) > 0;
    const total = m.networkTotalLocations;
    let max: number | null = MEDIA_QUANTITY_NETWORK_SOFT_MAX;
    if (hasPerUnit && total != null && total > 0 && !isNetworkTotalLocationsSampleCap(m)) {
      max = Math.max(min, total);
    }
    return { min, max, default: min };
  }
  if (isMobileSingleMedia(m)) {
    return { min: 1, max: null, default: 1 };
  }
  if (isPerUnitGradePriceOptions(m)) {
    const poIdx = 0;
    const suggested =
      m.priceOptions?.find((o) => (o.units ?? 0) > 0)?.units ??
      m.priceOptions?.[poIdx]?.units;
    return {
      min: 1,
      max: null,
      default: suggested != null && suggested > 0 ? suggested : 1,
    };
  }
  return { min: 1, max: 1, default: 1 };
}

/** 미지정·비정상 입력 시 bounds 내 정수 수량 */
export function resolveMediaQuantity(m: MediaItem, units?: number): number {
  const bounds = getQuantityBounds(m);
  if (!isQuantitySelectableMedia(m)) return 1;
  const raw =
    units == null || !Number.isFinite(units)
      ? bounds.default
      : Math.round(units);
  const qty = raw > 0 ? raw : bounds.default;
  const hi = bounds.max ?? Number.MAX_SAFE_INTEGER;
  return Math.min(hi, Math.max(bounds.min, qty));
}

/** 등급 옵션 월액(원) = 대당 단가 × 대수 */
export function resolveGradeOptionMonthlyPriceWon(
  m: MediaItem,
  priceOptionIndex: number,
  units?: number,
): number {
  const idx = Math.max(0, priceOptionIndex);
  const opt = m.priceOptions?.[idx] ?? m.priceOptions?.[0];
  const unitWon = catalogPriceFieldToWon(opt?.price ?? m.price);
  const qty = resolveMediaQuantity(m, units);
  return Math.round(unitWon * qty);
}

export type CatalogLinePriceOpts = {
  priceOptionIndex?: number;
  units?: number;
};

/**
 * 카탈로그 매체 월액(원) — 견적·플래너·어드민 공통.
 * - 네트워크: tier/단가×수량(기·대)
 * - 등급형 버스: 등급 단가×대수
 * - 패키지 총액 옵션: 선택 옵션가
 * - 이동형 단일: `price × units`
 */
export function resolveCatalogLineMonthlyPriceWon(
  m: MediaItem,
  opts?: CatalogLinePriceOpts,
): number {
  if (isNetworkCatalogItem(m)) {
    return resolveMonthlyPriceForUnits(m, opts?.units);
  }
  const poIdx = opts?.priceOptionIndex ?? 0;
  if (isPerUnitGradePriceOptions(m)) {
    return resolveGradeOptionMonthlyPriceWon(m, poIdx, opts?.units);
  }
  if (isPackageTotalPriceOptions(m)) {
    const opt = m.priceOptions?.[poIdx] ?? m.priceOptions?.[0];
    return catalogPriceFieldToWon(opt?.price ?? m.price);
  }
  return resolveMonthlyPriceForUnits(m, opts?.units);
}

/**
 * 월 단가(원) — 수량 반영.
 * - 네트워크: `computeNetworkMonthlyFromMediaItem` (tier → 단가×수량 → 패키지)
 * - 이동형 단일: `price × units`
 * - 단일 고정: `price` (units 무시)
 * - `units` 생략 시 `getQuantityBounds().default` (네트워크 = minUnits)
 */
export function resolveMonthlyPriceForUnits(
  m: MediaItem,
  units?: number,
): number {
  if (isNetworkCatalogItem(m)) {
    const u = resolveMediaQuantity(m, units);
    return computeNetworkMonthlyFromMediaItem(m, u);
  }
  const priceWon = catalogPriceFieldToWon(m.price);
  if (isMobileSingleMedia(m)) {
    const u = resolveMediaQuantity(m, units);
    return Math.round(priceWon * u);
  }
  return priceWon;
}

const DAYS_PER_MONTH = 30;

function baseMonthlyImpressions(m: MediaItem): number {
  if (m.monthlyFootTraffic != null && m.monthlyFootTraffic > 0) {
    return Math.round(m.monthlyFootTraffic);
  }
  const daily = m.dailyFootTraffic ?? 0;
  return Math.max(0, Math.round(daily * DAYS_PER_MONTH));
}

/**
 * 월 예상 노출(건) — `dailyFootTraffic`×30 기반.
 * - 네트워크·이동형 단일: units 비례
 * - 단일 고정: units 무관
 */
export function resolveImpressionsForUnits(
  m: MediaItem,
  units?: number,
): number {
  const base = baseMonthlyImpressions(m);
  if (!isQuantitySelectableMedia(m)) return base;
  if (isPerUnitGradePriceOptions(m) || isPackageTotalPriceOptions(m)) {
    return base;
  }
  const u = resolveMediaQuantity(m, units);
  return Math.round(base * u);
}
