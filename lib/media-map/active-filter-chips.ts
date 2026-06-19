import {
  MEDIA_REGION_CHIPS,
  MEDIA_TYPE_CHIPS,
} from "@/lib/media-discovery-filter-chips";
import {
  matchMediaMapPricePreset,
  MEDIA_MAP_PRICE_PRESETS,
} from "@/lib/media-map/price-presets";

export type MediaMapActiveFilterKey = "category" | "region" | "q" | "price";

export type MediaMapActiveFilterChip = {
  key: MediaMapActiveFilterKey;
  label: string;
};

type FilterInput = {
  category: string;
  region: string;
  q: string;
  minPrice: number | null;
  maxPrice: number | null;
};

function formatPriceRangeLabel(
  minPrice: number | null,
  maxPrice: number | null,
  isKo: boolean,
): string {
  const presetId = matchMediaMapPricePreset(minPrice, maxPrice);
  if (presetId && presetId !== "all") {
    const preset = MEDIA_MAP_PRICE_PRESETS.find((p) => p.id === presetId);
    if (preset) return isKo ? preset.labelKo : preset.labelEn;
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat(isKo ? "ko-KR" : "en-US").format(n);

  if (minPrice != null && maxPrice != null) {
    return isKo
      ? `${fmt(minPrice)}~${fmt(maxPrice)}원`
      : `₩${fmt(minPrice)}–${fmt(maxPrice)}`;
  }
  if (minPrice != null) {
    return isKo ? `${fmt(minPrice)}원~` : `₩${fmt(minPrice)}+`;
  }
  if (maxPrice != null) {
    return isKo ? `~${fmt(maxPrice)}원` : `Under ₩${fmt(maxPrice)}`;
  }
  return isKo ? "가격대" : "Budget";
}

export function buildMediaMapActiveFilterChips(
  filter: FilterInput,
  isKo: boolean,
): MediaMapActiveFilterChip[] {
  const chips: MediaMapActiveFilterChip[] = [];

  if (filter.category) {
    const typeChip = MEDIA_TYPE_CHIPS.find((c) => c.value === filter.category);
    chips.push({
      key: "category",
      label: typeChip?.label ?? filter.category,
    });
  }

  if (filter.region) {
    const regionChip = MEDIA_REGION_CHIPS.find((c) => c.value === filter.region);
    chips.push({
      key: "region",
      label: regionChip?.label ?? filter.region,
    });
  }

  if (filter.q.trim()) {
    chips.push({
      key: "q",
      label: isKo ? `검색: ${filter.q.trim()}` : `Search: ${filter.q.trim()}`,
    });
  }

  if (filter.minPrice != null || filter.maxPrice != null) {
    chips.push({
      key: "price",
      label: formatPriceRangeLabel(filter.minPrice, filter.maxPrice, isKo),
    });
  }

  return chips;
}
