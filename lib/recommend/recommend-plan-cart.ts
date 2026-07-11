import type { MediaItem } from "@/lib/media-data";
import type { ScoredMedia } from "@/lib/ai-media-recommend";
import type { PlanCartItem } from "@/lib/plan-cart";
import { planCartPortfolioPricing } from "@/lib/plan-cart-pricing";
import { planCartCatalogById } from "@/lib/plan-cart-pricing";
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
  catalog?: readonly MediaItem[],
): {
  quantities: CampaignMediaQuantities;
  priceOptionIndex: CampaignMediaPriceOptionIndex;
} {
  const filtered = planItems.filter((item) => portfolioIds.has(item.mediaId));
  const syntheticCart = {
    items: filtered,
    updatedAt: new Date(0).toISOString(),
  };
  const pricing = planCartPortfolioPricing(syntheticCart);

  if (!catalog?.length) {
    return {
      quantities: pricing.quantities ?? {},
      priceOptionIndex: pricing.priceOptionIndex ?? {},
    };
  }

  const byId = planCartCatalogById(catalog);
  const quantities = { ...(pricing.quantities ?? {}) };
  const priceOptionIndex = { ...(pricing.priceOptionIndex ?? {}) };

  for (const item of filtered) {
    const media = byId.get(item.mediaId);
    if (!media) continue;
    if (quantities[item.mediaId] == null) {
      const q = item.quantity;
      if (q != null && Number.isFinite(q)) {
        quantities[item.mediaId] = Math.round(q);
      }
    }
    if (priceOptionIndex[item.mediaId] == null) {
      const idx = item.priceOptionIndex;
      if (idx != null && Number.isFinite(idx)) {
        priceOptionIndex[item.mediaId] = Math.round(idx);
      }
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
