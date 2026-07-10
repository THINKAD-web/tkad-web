import type { MediaItem } from "@/lib/media-data";
import type { ScoredMedia } from "@/lib/ai-media-recommend";
import type { PlanCartItem } from "@/lib/plan-cart";
import type {
  CampaignMediaPriceOptionIndex,
  CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";

/** plan cart 순서대로 portfolio — 추천 결과 밖 매체도 카탈로그에 있으면 포함 */
export function resolveRecommendPortfolioFromPlanCart(
  planItems: readonly PlanCartItem[],
  _fullList: readonly ScoredMedia[] | null,
  catalog: readonly MediaItem[],
): MediaItem[] {
  if (planItems.length === 0) return [];

  const byId = new Map(catalog.map((m) => [m.id, m]));
  const picked: MediaItem[] = [];
  const seen = new Set<string>();

  for (const pi of planItems) {
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

export function buildManualAddedScoredMedia(
  item: MediaItem,
  isKo: boolean,
): ScoredMedia {
  return {
    item,
    score: 0,
    reasons: [
      {
        ko: "직접 추가한 매체",
        en: "Manually added media",
      },
    ],
  };
}
