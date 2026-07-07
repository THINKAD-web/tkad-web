import type { MediaItem } from "@/lib/media-data";
import {
  isPerUnitGradePriceOptions,
  resolveCatalogLineMonthlyPriceWon,
  resolveGradeOptionMonthlyPriceWon,
  resolveMediaQuantity,
} from "@/lib/media-quantity";
import type {
  PlanCart,
  PlanCartAddonLine,
  PlanCartGradeSelection,
  PlanCartItem,
} from "@/lib/plan-cart";
import type {
  CampaignMediaPriceOptionIndex,
  CampaignMediaQuantities,
  PlannerPortfolioPricing,
} from "@/lib/planner/planner-media-quantity";

export function planCartItemQuantity(
  item: Pick<PlanCartItem, "quantity">,
): number | undefined {
  if (item.quantity == null || !Number.isFinite(item.quantity) || item.quantity <= 0) {
    return undefined;
  }
  return Math.round(item.quantity);
}

export function planCartItemPriceOptionIndex(
  item: Pick<PlanCartItem, "priceOptionIndex">,
): number | undefined {
  if (
    item.priceOptionIndex == null ||
    !Number.isFinite(item.priceOptionIndex) ||
    item.priceOptionIndex < 0
  ) {
    return undefined;
  }
  return Math.round(item.priceOptionIndex);
}

/** 등급형 버스 — 복수 등급 행 (레거시 단일 필드 → 1행으로 승격) */
export function planCartEffectiveGradeSelections(
  item: PlanCartItem,
  media?: MediaItem | null,
): PlanCartGradeSelection[] | null {
  if (!media || !isPerUnitGradePriceOptions(media)) return null;
  if (item.gradeSelections?.length) return item.gradeSelections;
  return [
    {
      priceOptionIndex: planCartItemPriceOptionIndex(item) ?? 0,
      quantity: resolveMediaQuantity(media, planCartItemQuantity(item)),
    },
  ];
}

export function planCartPortfolioPricing(cart: PlanCart): PlannerPortfolioPricing {
  const quantities: CampaignMediaQuantities = {};
  const priceOptionIndex: CampaignMediaPriceOptionIndex = {};
  for (const item of cart.items) {
    if (item.gradeSelections?.length) {
      quantities[item.mediaId] = item.gradeSelections.reduce(
        (sum, sel) => sum + sel.quantity,
        0,
      );
      priceOptionIndex[item.mediaId] = item.gradeSelections[0]!.priceOptionIndex;
      continue;
    }
    const po = planCartItemPriceOptionIndex(item);
    if (po != null) priceOptionIndex[item.mediaId] = po;
    const q = planCartItemQuantity(item);
    if (q != null) quantities[item.mediaId] = q;
  }
  return { quantities, priceOptionIndex };
}

export function planCartToCampaignQuantities(
  cart: PlanCart,
): CampaignMediaQuantities {
  return planCartPortfolioPricing(cart).quantities ?? {};
}

export function planCartToCampaignPriceOptionIndex(
  cart: PlanCart,
): CampaignMediaPriceOptionIndex {
  return planCartPortfolioPricing(cart).priceOptionIndex ?? {};
}

export function planCartCatalogById(
  catalog: readonly MediaItem[] | ReadonlyMap<string, MediaItem>,
): ReadonlyMap<string, MediaItem> {
  if (catalog instanceof Map) return catalog;
  return new Map(catalog.map((m) => [m.id, m]));
}

export function planCartLineMonthlyWon(
  item: PlanCartItem,
  media?: MediaItem | null,
): number {
  const grades = planCartEffectiveGradeSelections(item, media);
  if (grades?.length && media) {
    return grades.reduce(
      (sum, sel) =>
        sum +
        resolveGradeOptionMonthlyPriceWon(
          media,
          sel.priceOptionIndex,
          sel.quantity,
        ),
      0,
    );
  }
  if (media) {
    return resolveCatalogLineMonthlyPriceWon(media, {
      units: planCartItemQuantity(item),
      priceOptionIndex: planCartItemPriceOptionIndex(item),
    });
  }
  const qty = planCartItemQuantity(item) ?? 1;
  return (item.price > 0 ? item.price : 0) * qty;
}

export function planCartMonthlyTotalWon(
  cart: PlanCart,
  catalog?: readonly MediaItem[] | ReadonlyMap<string, MediaItem>,
): number {
  const byId = catalog ? planCartCatalogById(catalog) : null;
  return cart.items.reduce(
    (sum, item) => sum + planCartLineMonthlyWon(item, byId?.get(item.mediaId)),
    0,
  );
}

export function planCartAddonLineTotalWon(line: PlanCartAddonLine): number {
  return Math.round(Math.max(0, line.unitPriceWon) * Math.max(1, line.quantity));
}

export function planCartItemAddonTotalWon(item: PlanCartItem): number {
  return (item.addonLines ?? []).reduce(
    (sum, line) => sum + planCartAddonLineTotalWon(line),
    0,
  );
}

export function planCartAddonTotalWon(cart: PlanCart): number {
  const fromItems = cart.items.reduce(
    (sum, item) => sum + planCartItemAddonTotalWon(item),
    0,
  );
  const legacy = (cart.addonLines ?? []).reduce(
    (sum, line) => sum + planCartAddonLineTotalWon(line),
    0,
  );
  return fromItems + legacy;
}

export function planCartPeriodTotalWon(
  cart: PlanCart,
  catalog?: readonly MediaItem[] | ReadonlyMap<string, MediaItem>,
): number {
  const months = Math.max(1, cart.duration ?? 1);
  return (
    planCartMonthlyTotalWon(cart, catalog) * months + planCartAddonTotalWon(cart)
  );
}

export function planCartResolvedUnits(
  item: PlanCartItem,
  media?: MediaItem | null,
): number {
  const grades = planCartEffectiveGradeSelections(item, media);
  if (grades?.length) {
    return grades.reduce((sum, sel) => sum + sel.quantity, 0);
  }
  if (media) return resolveMediaQuantity(media, planCartItemQuantity(item));
  return planCartItemQuantity(item) ?? 1;
}

/** 월 단가(원) — 라인 총액 ÷ 수량 */
export function planCartLineUnitMonthlyWon(
  item: PlanCartItem,
  media?: MediaItem | null,
): number {
  const line = planCartLineMonthlyWon(item, media);
  const units = planCartResolvedUnits(item, media);
  if (line <= 0 || units <= 0) return 0;
  return Math.round(line / units);
}
