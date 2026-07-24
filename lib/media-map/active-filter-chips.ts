import { MEDIA_CATEGORIES } from "@/lib/media-browse-categories";
import { MEDIA_BROWSE_REGIONS } from "@/lib/media-browse-regions";
import { MEDIA_TARGET_CHIPS } from "@/lib/media-discovery-filter-chips";
import {
  matchMediaMapPricePreset,
  MEDIA_MAP_PRICE_PRESETS,
} from "@/lib/media-map/price-presets";
import type { MapBrowseFilters } from "@/lib/media-map/browse-filters";

export type MediaMapActiveFilterKey =
  | "mainCategory"
  | "subCategory"
  | "target"
  | "regionMain"
  | "regionSub"
  | "price"
  | `feature:${string}`;

export type MediaMapActiveFilterChip = {
  key: MediaMapActiveFilterKey;
  label: string;
};

const FEATURE_LABELS: Record<string, { labelKo: string; labelEn: string }> = {
  instant_booking: { labelKo: "즉시 예약(안내)", labelEn: "Instant book (info)" },
  network: { labelKo: "네트워크", labelEn: "Network" },
  "24h": { labelKo: "24시간", labelEn: "24h" },
};

function formatPriceRangeLabel(
  minPrice: string,
  maxPrice: string,
  isKo: boolean,
): string {
  const min = minPrice.trim() ? Number(minPrice) : null;
  const max = maxPrice.trim() ? Number(maxPrice) : null;
  const minPriceNum = min != null && !Number.isNaN(min) ? min : null;
  const maxPriceNum = max != null && !Number.isNaN(max) ? max : null;

  const presetId = matchMediaMapPricePreset(minPriceNum, maxPriceNum);
  if (presetId && presetId !== "all") {
    const preset = MEDIA_MAP_PRICE_PRESETS.find((p) => p.id === presetId);
    if (preset) return isKo ? preset.labelKo : preset.labelEn;
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat(isKo ? "ko-KR" : "en-US").format(n);

  if (minPriceNum != null && maxPriceNum != null) {
    return isKo
      ? `${fmt(minPriceNum)}~${fmt(maxPriceNum)}원`
      : `₩${fmt(minPriceNum)}–${fmt(maxPriceNum)}`;
  }
  if (minPriceNum != null) {
    return isKo ? `${fmt(minPriceNum)}원~` : `₩${fmt(minPriceNum)}+`;
  }
  if (maxPriceNum != null) {
    return isKo ? `~${fmt(maxPriceNum)}원` : `Under ₩${fmt(maxPriceNum)}`;
  }
  return isKo ? "가격대" : "Budget";
}

function resolveMainCategoryLabel(id: string, isKo: boolean): string {
  const main = MEDIA_CATEGORIES.find((m) => m.id === id);
  if (!main) return id;
  return isKo ? main.label : main.labelEn ?? main.label;
}

function resolveSubCategoryLabel(
  mainId: string,
  subId: string,
  isKo: boolean,
): string {
  const main = MEDIA_CATEGORIES.find((m) => m.id === mainId);
  const sub = main?.sub.find((s) => s.id === subId);
  if (!sub) return subId;
  return isKo ? sub.label : sub.labelEn ?? sub.label;
}

function resolveRegionMainLabel(id: string, isKo: boolean): string {
  const region = MEDIA_BROWSE_REGIONS.find((r) => r.id === id);
  if (!region) return id;
  return isKo ? region.label : region.labelEn ?? region.label;
}

function resolveRegionSubLabel(
  mainId: string,
  subId: string,
  isKo: boolean,
): string {
  const main = MEDIA_BROWSE_REGIONS.find((r) => r.id === mainId);
  const sub = main?.sub.find((s) => s.id === subId);
  if (!sub) return subId;
  return isKo ? sub.label : sub.labelEn ?? sub.label;
}

/** `/media/map` 좌측 패널 — 접힌 상태 활성 필터 칩 스트립 */
export function buildMapBrowseActiveFilterChips(
  filters: Pick<
    MapBrowseFilters,
    | "mainCategory"
    | "subCategory"
    | "target"
    | "regionMain"
    | "regionSub"
    | "priceMin"
    | "priceMax"
    | "features"
  >,
  isKo: boolean,
): MediaMapActiveFilterChip[] {
  const chips: MediaMapActiveFilterChip[] = [];

  if (filters.mainCategory) {
    chips.push({
      key: "mainCategory",
      label: resolveMainCategoryLabel(filters.mainCategory, isKo),
    });
  }

  if (filters.subCategory) {
    chips.push({
      key: "subCategory",
      label: resolveSubCategoryLabel(
        filters.mainCategory,
        filters.subCategory,
        isKo,
      ),
    });
  }

  if (filters.target) {
    const targetChip = MEDIA_TARGET_CHIPS.find((c) => c.value === filters.target);
    chips.push({
      key: "target",
      label: targetChip?.label ?? filters.target,
    });
  }

  if (filters.regionMain) {
    chips.push({
      key: "regionMain",
      label: resolveRegionMainLabel(filters.regionMain, isKo),
    });
  }

  if (filters.regionSub) {
    chips.push({
      key: "regionSub",
      label: resolveRegionSubLabel(
        filters.regionMain,
        filters.regionSub,
        isKo,
      ),
    });
  }

  if (filters.priceMin.trim() || filters.priceMax.trim()) {
    chips.push({
      key: "price",
      label: formatPriceRangeLabel(filters.priceMin, filters.priceMax, isKo),
    });
  }

  const featureParts = filters.features
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const feature of featureParts) {
    const meta = FEATURE_LABELS[feature];
    chips.push({
      key: `feature:${feature}`,
      label: meta ? (isKo ? meta.labelKo : meta.labelEn) : feature,
    });
  }

  return chips;
}
