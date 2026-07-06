import type { MediaItem } from "@/lib/media-data";
import { buildQuoteWizardEntryHref } from "@/lib/quote-wizard-entry";

/** 비교 카트 우선, 없으면 담기(plan) 매체 ID로 견적 진입 */
export function buildSelectionQuoteHref(
  compareItems: readonly MediaItem[],
  planMediaIds: readonly string[],
): string {
  if (compareItems.length > 0) {
    return buildQuoteWizardEntryHref(compareItems);
  }
  const ids = planMediaIds.filter(Boolean);
  if (ids.length > 0) {
    return `/quote?media=${ids.join(",")}`;
  }
  return "/quote";
}

export function formatSelectionCountLabel(
  planCount: number,
  compareCount: number,
  isKo: boolean,
): string {
  const parts: string[] = [];
  if (planCount > 0) {
    parts.push(isKo ? `담긴 ${planCount}` : `${planCount} saved`);
  }
  if (compareCount > 0) {
    parts.push(isKo ? `비교 ${compareCount}` : `${compareCount} compare`);
  }
  return parts.join(isKo ? " · " : " · ");
}
