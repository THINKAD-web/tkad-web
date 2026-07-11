import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { isNetworkCatalogItem } from "@/lib/matching-network-helpers";
import {
  getQuantityUnitMode,
  isPerUnitGradePriceOptions,
  resolveMediaQuantity,
} from "@/lib/media-quantity";
import { formatPlannerQuantityLabel } from "@/lib/planner/planner-media-quantity";
import type { PlanCartItem } from "@/lib/plan-cart";
import {
  planCartEffectiveOptionSelections,
  resolveOptionSelectionMonthlyPriceWon,
} from "@/lib/plan-cart-option-selections";
import type { QuoteMediaSelectionSnapshot } from "@/lib/quote-media-selections";

export type BuildQuoteMediaSelectionInput = {
  media: MediaItem;
  isKo: boolean;
  priceOptionIndex: number;
  /** 네트워크·이동형 unit 모드 수량 — 생략 시 bounds default */
  units?: number;
  lineTotalWon: number;
  usePackagePeriod?: boolean;
  lineCampaignDays?: number;
};

/** 견적 제출·export용 매체 선택 스냅샷 (package/unit 모드 반영) */
export function buildQuoteMediaSelectionSnapshot(
  input: BuildQuoteMediaSelectionInput,
): QuoteMediaSelectionSnapshot {
  const { media: m, isKo, priceOptionIndex: poIdx } = input;
  const priceOpt = m.priceOptions?.[poIdx];
  const isNw = isNetworkCatalogItem(m);
  const quantity = resolveMediaQuantity(
    m,
    input.units ?? (isNw ? (m.networkMinUnits ?? 1) : undefined),
  );
  const priceOptionIndex =
    isPerUnitGradePriceOptions(m) || getQuantityUnitMode(m) === "package"
      ? poIdx
      : 0;

  return {
    mediaId: m.id,
    priceOptionIndex,
    quantity,
    quantityLabel: formatPlannerQuantityLabel(m, quantity, isKo, {
      [m.id]: priceOptionIndex,
    }),
    optionLabel: priceOpt?.label?.trim() ?? null,
    optionPriceWon: priceOpt
      ? catalogPriceFieldToWon(priceOpt.price)
      : catalogPriceFieldToWon(m.price),
    lineTotalWon: input.lineTotalWon,
    optionDescription: priceOpt?.description?.trim() ?? null,
    ...(input.usePackagePeriod
      ? {
          usePackagePeriod: true as const,
          lineCampaignDays: input.lineCampaignDays,
        }
      : {}),
  };
}

function planCartUsesExplicitOptionRows(item: PlanCartItem): boolean {
  return (
    (item.optionSelections?.length ?? 0) > 0 ||
    (item.gradeSelections?.length ?? 0) > 0
  );
}

/** plan cart 아이템 → 견적 mediaSelections (복수 옵션 행이면 배열 확장) */
export function buildQuoteMediaSelectionSnapshotsFromCartItem(input: {
  media: MediaItem;
  item: PlanCartItem;
  isKo: boolean;
  usePackagePeriod?: boolean;
  lineCampaignDays?: number;
}): QuoteMediaSelectionSnapshot[] {
  const { media: m, item, isKo } = input;
  const rows = planCartEffectiveOptionSelections(item, m);
  const usesMulti =
    planCartUsesExplicitOptionRows(item) && (rows?.length ?? 0) > 1;

  if (!rows?.length || !usesMulti) {
    const poIdx = rows?.[0]?.priceOptionIndex ?? item.priceOptionIndex ?? 0;
    const units = rows?.[0]?.quantity ?? item.quantity;
    const lineTotalWon = resolveOptionSelectionMonthlyPriceWon(m, {
      priceOptionIndex: poIdx,
      quantity:
        units != null && Number.isFinite(units)
          ? Math.round(units)
          : resolveMediaQuantity(m, undefined),
    });
    return [
      buildQuoteMediaSelectionSnapshot({
        media: m,
        isKo,
        priceOptionIndex: poIdx,
        units,
        lineTotalWon,
        usePackagePeriod: input.usePackagePeriod,
        lineCampaignDays: input.lineCampaignDays,
      }),
    ];
  }

  return rows.map((row) =>
    buildQuoteMediaSelectionSnapshot({
      media: m,
      isKo,
      priceOptionIndex: row.priceOptionIndex,
      units: row.quantity,
      lineTotalWon: resolveOptionSelectionMonthlyPriceWon(m, row),
      usePackagePeriod: input.usePackagePeriod,
      lineCampaignDays: input.lineCampaignDays,
    }),
  );
}
