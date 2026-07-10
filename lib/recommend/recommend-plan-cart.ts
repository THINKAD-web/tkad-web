import type { MediaItem } from "@/lib/media-data";
import type { ScoredMedia } from "@/lib/ai-media-recommend";
import type { PlanCartItem } from "@/lib/plan-cart";
import type {
  CampaignMediaPriceOptionIndex,
  CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";

/** recommend 결과 풀 ∩ plan cart 순서 — 견적·보고서 portfolio SSOT */
export function resolveRecommendPortfolioFromPlanCart(
  planItems: readonly PlanCartItem[],
  fullList: readonly ScoredMedia[] | null,
  catalog: readonly MediaItem[],
): MediaItem[] {
  if (!fullList?.length || planItems.length === 0) return [];

  const resultIds = new Set(fullList.map((s) => s.item.id));
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const picked: MediaItem[] = [];
  const seen = new Set<string>();

  for (const pi of planItems) {
    if (!resultIds.has(pi.mediaId)) continue;
    const media = byId.get(pi.mediaId);
    if (!media || seen.has(media.id)) continue;
    seen.add(media.id);
    picked.push(media);
  }

  return picked;
}

export function recommendPricingFromPlanCart(
  planItems: readonly PlanCartItem[],
  portfolioIds: ReadonlySet<string>,
): {
  quantities: CampaignMediaQuantities;
  priceOptionIndex: CampaignMediaPriceOptionIndex;
} {
  const quantities: CampaignMediaQuantities = {};
  const priceOptionIndex: CampaignMediaPriceOptionIndex = {};

  for (const item of planItems) {
    if (!portfolioIds.has(item.mediaId)) continue;
    if (item.quantity != null && Number.isFinite(item.quantity)) {
      quantities[item.mediaId] = Math.round(item.quantity);
    }
    if (
      item.priceOptionIndex != null &&
      Number.isFinite(item.priceOptionIndex)
    ) {
      priceOptionIndex[item.mediaId] = Math.round(item.priceOptionIndex);
    }
  }

  return { quantities, priceOptionIndex };
}
