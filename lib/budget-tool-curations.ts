import type { MediaItem } from "@/lib/media-data";
import { recommendMedia } from "@/lib/ai-media-recommend";
import { mediaMonthlyPriceWon } from "@/lib/media-price-transparency";

export type BudgetTier = {
  id: string;
  budgetMan: number;
  titleKo: string;
  titleEn: string;
  descKo: string;
  descEn: string;
};

export const BUDGET_TIERS: BudgetTier[] = [
  {
    id: "500",
    budgetMan: 500,
    titleKo: "500만원으로 할 수 있는 OOH",
    titleEn: "OOH with ₩5M/month",
    descKo: "소규모 테스트·단일 매체 집행에 적합한 조합",
    descEn: "Lean test flights and single-surface picks",
  },
  {
    id: "1000",
    budgetMan: 1000,
    titleKo: "1,000만원 베스트 조합",
    titleEn: "Best mix at ₩10M/month",
    descKo: "강남·홍대 등 핵심 2~3면 믹스",
    descEn: "2–3 surfaces across key districts",
  },
  {
    id: "3000",
    budgetMan: 3000,
    titleKo: "3,000만원 풀 캠페인",
    titleEn: "Full campaign at ₩30M/month",
    descKo: "디지털+정적 믹스로 도달 극대화",
    descEn: "Digital + static mix for max reach",
  },
];

export type BudgetCuration = {
  tier: BudgetTier;
  mediaIds: string[];
  items: MediaItem[];
  totalPriceMan: number;
};

export function curateBudgetTier(
  tier: BudgetTier,
  catalog: readonly MediaItem[],
): BudgetCuration {
  const budgetWon = tier.budgetMan * 10_000;
  const scored = recommendMedia(
    {
      goal: "awareness",
      target: "mass",
      budgetMaxMan: tier.budgetMan,
      region: "all",
      industry: "other",
    },
    catalog.filter((m) => mediaMonthlyPriceWon(m) <= budgetWon * 0.85),
    catalog,
  );

  const maxItems =
    tier.budgetMan >= 3000 ? 6 : tier.budgetMan >= 1000 ? 4 : 2;
  const items: MediaItem[] = [];
  let sum = 0;
  for (const s of scored) {
    const p = mediaMonthlyPriceWon(s.item);
    if (p <= 0) continue;
    if (sum + p > budgetWon) continue;
    items.push(s.item);
    sum += p;
    if (items.length >= maxItems) {
      break;
    }
  }

  return {
    tier,
    mediaIds: items.map((m) => m.id),
    items,
    totalPriceMan: Math.round(sum / 10_000),
  };
}

export function curateAllBudgetTiers(
  catalog: readonly MediaItem[],
): BudgetCuration[] {
  return BUDGET_TIERS.map((t) => curateBudgetTier(t, catalog));
}
