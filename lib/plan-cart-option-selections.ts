import type { MediaItem } from "@/lib/media-data";
import {
  getQuantityUnitMode,
  isPackageTotalPriceOptions,
  isPerUnitGradePriceOptions,
  resolveCatalogLineMonthlyPriceWon,
  resolveGradeOptionMonthlyPriceWon,
  resolveMediaQuantity,
} from "@/lib/media-quantity";
import { isNetworkCatalogItem } from "@/lib/matching-network-helpers";
import { formatPlannerQuantityLabel } from "@/lib/planner/planner-media-quantity";
import type { PlanCartItem, PlanCartOptionSelection } from "@/lib/plan-cart";

export type { PlanCartOptionSelection };

/** 복수 옵션·수량 행 편집 대상 — 등급형 버스 + package priceOptions 매체 */
export function supportsMultiOptionSelections(m: MediaItem): boolean {
  if (isPerUnitGradePriceOptions(m)) return true;
  if (isNetworkCatalogItem(m)) return false;
  const opts = m.priceOptions ?? [];
  if (opts.length <= 1) return false;
  return (
    getQuantityUnitMode(m) === "package" || isPackageTotalPriceOptions(m)
  );
}

export function normalizePlanCartOptionSelection(
  raw: unknown,
): PlanCartOptionSelection | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const priceOptionIndex =
    typeof o.priceOptionIndex === "number" &&
    Number.isFinite(o.priceOptionIndex) &&
    o.priceOptionIndex >= 0
      ? Math.round(o.priceOptionIndex)
      : null;
  const quantity =
    typeof o.quantity === "number" &&
    Number.isFinite(o.quantity) &&
    o.quantity > 0
      ? Math.round(o.quantity)
      : null;
  if (priceOptionIndex == null || quantity == null) return null;
  return { priceOptionIndex, quantity };
}

export function normalizePlanCartOptionSelections(
  raw: unknown,
): PlanCartOptionSelection[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map(normalizePlanCartOptionSelection)
    .filter((x): x is PlanCartOptionSelection => x !== null);
  return out.length > 0 ? out : undefined;
}

/**
 * 카트 아이템의 유효 옵션 행 — 저장 호환 폴백:
 * optionSelections → gradeSelections → 단일 priceOptionIndex/quantity
 */
export function planCartEffectiveOptionSelections(
  item: PlanCartItem,
  media?: MediaItem | null,
): PlanCartOptionSelection[] | null {
  if (item.optionSelections?.length) return [...item.optionSelections];
  if (item.gradeSelections?.length) return [...item.gradeSelections];
  const po =
    item.priceOptionIndex != null &&
    Number.isFinite(item.priceOptionIndex) &&
    item.priceOptionIndex >= 0
      ? Math.round(item.priceOptionIndex)
      : undefined;
  const qty =
    item.quantity != null &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0
      ? Math.round(item.quantity)
      : undefined;
  if (po != null || qty != null || media) {
    return [
      {
        priceOptionIndex: po ?? 0,
        quantity: media
          ? resolveMediaQuantity(media, qty)
          : Math.max(1, qty ?? 1),
      },
    ];
  }
  return null;
}

/** 옵션 행 1줄 월액(원) */
export function resolveOptionSelectionMonthlyPriceWon(
  media: MediaItem,
  selection: PlanCartOptionSelection,
): number {
  if (isPerUnitGradePriceOptions(media)) {
    return resolveGradeOptionMonthlyPriceWon(
      media,
      selection.priceOptionIndex,
      selection.quantity,
    );
  }
  return resolveCatalogLineMonthlyPriceWon(media, {
    priceOptionIndex: selection.priceOptionIndex,
    units: selection.quantity,
  });
}

/** 카트 아이템이 복수 옵션 행 편집 UI 대상인지 */
export function planCartItemUsesMultiOptionSelections(
  item: PlanCartItem,
  media?: MediaItem | null,
): boolean {
  if ((item.optionSelections?.length ?? 0) > 0) return true;
  if ((item.gradeSelections?.length ?? 0) > 0) return true;
  if (!media) return false;
  return supportsMultiOptionSelections(media);
}

function hasExplicitPlanCartOptionRows(item: PlanCartItem): boolean {
  return (
    (item.optionSelections?.length ?? 0) > 0 ||
    (item.gradeSelections?.length ?? 0) > 0
  );
}

/** 보고서·카드 요약 — "옵션 2종" / "2개 등급" */
export function formatPlanCartMultiOptionSummaryShort(
  media: MediaItem,
  item: PlanCartItem,
  isKo: boolean,
): string | undefined {
  const rows = planCartEffectiveOptionSelections(item, media);
  if (!hasExplicitPlanCartOptionRows(item) || !rows || rows.length <= 1) {
    return undefined;
  }
  if (isPerUnitGradePriceOptions(media)) {
    return isKo
      ? `${rows.length}개 등급`
      : `${rows.length} grades`;
  }
  return isKo ? `옵션 ${rows.length}종` : `${rows.length} options`;
}

/** 견적·보고서 라벨 — "옵션1 2대 · 옵션2 3대" */
export function formatPlanCartMultiOptionQuantityLabel(
  media: MediaItem,
  item: PlanCartItem,
  isKo: boolean,
): string | undefined {
  const rows = planCartEffectiveOptionSelections(item, media);
  if (!hasExplicitPlanCartOptionRows(item) || !rows || rows.length <= 1) {
    return undefined;
  }
  return rows
    .map((row) =>
      formatPlannerQuantityLabel(media, row.quantity, isKo, {
        [media.id]: row.priceOptionIndex,
      }),
    )
    .join(isKo ? " · " : " · ");
}
