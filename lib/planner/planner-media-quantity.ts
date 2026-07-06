import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToPriceMan, catalogPriceFieldToWon } from "@/lib/media-price-format";
import { isNetworkCatalogItem } from "@/lib/matching-network-helpers";
import { networkInventoryUnitSuffix } from "@/lib/media-network-types";
import {
  getMediaPackageOptions,
  getQuantityUnitMode,
  isMobileSingleMedia,
  isQuantitySelectableMedia,
  resolveImpressionsForUnits,
  resolveMediaQuantity,
  resolveMonthlyPriceForUnits,
  type MediaPackageOption,
  type MediaQuantityUnitMode,
} from "@/lib/media-quantity";

/** 플래너 선택 매체별 수량 — 미지정 시 `getQuantityBounds().default` */
export type CampaignMediaQuantities = Record<string, number>;

/** `priceOptions` 패키지 매체 — 옵션 인덱스 */
export type CampaignMediaPriceOptionIndex = Record<string, number>;

/** 플래너 포트폴리오 예산·노출 계산 컨텍스트 */
export type PlannerPortfolioPricing = {
  quantities?: CampaignMediaQuantities;
  priceOptionIndex?: CampaignMediaPriceOptionIndex;
};

export function pruneCampaignMediaPriceOptionIndex(
  mediaIds: readonly string[],
  index: CampaignMediaPriceOptionIndex,
): CampaignMediaPriceOptionIndex {
  const next: CampaignMediaPriceOptionIndex = {};
  for (const id of mediaIds) {
    const i = index[id];
    if (i != null && Number.isFinite(i) && i >= 0) next[id] = Math.round(i);
  }
  return next;
}

export function plannerUnitsForMedia(
  m: MediaItem,
  quantities?: CampaignMediaQuantities,
): number {
  return resolveMediaQuantity(m, quantities?.[m.id]);
}

export function plannerMonthlyPriceWonForMedia(
  m: MediaItem,
  quantities?: CampaignMediaQuantities,
  priceOptionIndex?: CampaignMediaPriceOptionIndex,
): number {
  if (getQuantityUnitMode(m) === "package" && !isNetworkCatalogItem(m)) {
    const idx = priceOptionIndex?.[m.id] ?? 0;
    const opt = m.priceOptions?.[idx] ?? m.priceOptions?.[0];
    if (opt) return catalogPriceFieldToWon(opt.price);
  }
  return resolveMonthlyPriceForUnits(m, quantities?.[m.id]);
}

export function plannerMonthlyPriceManForMedia(
  m: MediaItem,
  quantities?: CampaignMediaQuantities,
  priceOptionIndex?: CampaignMediaPriceOptionIndex,
): number {
  return catalogPriceFieldToPriceMan(
    plannerMonthlyPriceWonForMedia(m, quantities, priceOptionIndex),
  );
}

export function plannerMonthlyImpressionsForMedia(
  m: MediaItem,
  quantities?: CampaignMediaQuantities,
  priceOptionIndex?: CampaignMediaPriceOptionIndex,
): number {
  if (getQuantityUnitMode(m) === "package" && !isNetworkCatalogItem(m)) {
    return resolveImpressionsForUnits(m, 1);
  }
  return resolveImpressionsForUnits(m, quantities?.[m.id]);
}

export function pruneCampaignMediaQuantities(
  mediaIds: readonly string[],
  quantities: CampaignMediaQuantities,
): CampaignMediaQuantities {
  const next: CampaignMediaQuantities = {};
  for (const id of mediaIds) {
    const q = quantities[id];
    if (q != null && Number.isFinite(q) && q > 0) next[id] = Math.round(q);
  }
  return next;
}

export function plannerQuantityUnitMode(m: MediaItem): MediaQuantityUnitMode {
  return getQuantityUnitMode(m);
}

export function plannerPackageOptions(
  m: MediaItem,
  isKo: boolean,
): MediaPackageOption[] {
  return getMediaPackageOptions(m, isKo);
}

export function formatPlannerQuantityLabel(
  m: MediaItem,
  units: number,
  isKo: boolean,
  priceOptionIndex?: CampaignMediaPriceOptionIndex,
): string {
  if (getQuantityUnitMode(m) === "package") {
    if (isNetworkCatalogItem(m)) {
      const opt = getMediaPackageOptions(m, isKo).find((o) => o.units === units);
      if (opt) return opt.label.split(" · ")[0] ?? opt.label;
    } else {
      const idx = priceOptionIndex?.[m.id] ?? 0;
      const opt = m.priceOptions?.[idx];
      if (opt?.label) return opt.label;
    }
  }
  if (isNetworkCatalogItem(m)) {
    const suffix = networkInventoryUnitSuffix(
      m.networkSubtype ?? m.type,
      isKo,
      m.tags,
    );
    return isKo
      ? `${units.toLocaleString("ko-KR")}${suffix || "대"}`
      : `${units.toLocaleString("en-US")} units`;
  }
  if (isMobileSingleMedia(m)) {
    return isKo ? `${units}대` : `${units} units`;
  }
  return String(units);
}

export function shouldShowPlannerQuantityControl(m: MediaItem): boolean {
  if (!isQuantitySelectableMedia(m)) return false;
  if (getQuantityUnitMode(m) === "package") {
    return getMediaPackageOptions(m, true).length > 0;
  }
  return true;
}

/** @deprecated use shouldShowPlannerQuantityControl */
export function shouldShowPlannerQuantityStepper(m: MediaItem): boolean {
  return shouldShowPlannerQuantityControl(m) && getQuantityUnitMode(m) === "unit";
}

export function defaultPackageUnitsForMedia(m: MediaItem): number {
  const opts = getMediaPackageOptions(m, true);
  return opts[0]?.units ?? resolveMediaQuantity(m);
}

export function syncQuantityAfterPackagePick(
  m: MediaItem,
  option: MediaPackageOption,
): number {
  if (option.units != null && option.units > 0) return option.units;
  return resolveMediaQuantity(m);
}
