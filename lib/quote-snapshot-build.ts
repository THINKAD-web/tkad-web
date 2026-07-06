import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { isNetworkCatalogItem } from "@/lib/matching-network-helpers";
import { getQuantityUnitMode, resolveMediaQuantity } from "@/lib/media-quantity";
import { formatPlannerQuantityLabel } from "@/lib/planner/planner-media-quantity";
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
    input.units ??
      (isNw ? m.networkMinUnits ?? 1 : getQuantityUnitMode(m) === "unit" ? 1 : undefined),
  );
  const priceOptionIndex = getQuantityUnitMode(m) === "package" ? poIdx : 0;

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
