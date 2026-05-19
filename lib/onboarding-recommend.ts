import {
  recommendMedia,
  type AiRecommendInput,
  type Industry,
} from "@/lib/ai-media-recommend";
import type { MediaItem } from "@/lib/media-data";
import type {
  OnboardingBudgetRange,
  OnboardingIndustry,
  UserPreferenceDto,
} from "@/lib/onboarding-types";
import { needsIndustrySteps } from "@/lib/onboarding-types";

function mapIndustry(industries: OnboardingIndustry[]): Industry {
  if (industries.includes("beauty_fashion")) return "beauty";
  if (industries.includes("fnb")) return "fmcg";
  if (industries.includes("finance")) return "fintech";
  if (industries.includes("entertainment")) return "entertainment";
  if (industries.includes("tech")) return "retail";
  return "other";
}

function mapBudget(range: OnboardingBudgetRange | null): number {
  switch (range) {
    case "under_500":
      return 50;
    case "500_3000":
      return 300;
    case "over_3000":
      return 0;
    default:
      return 0;
  }
}

function regionFromIndustries(industries: OnboardingIndustry[]): string {
  return "all";
}

export function buildRecommendInputFromPreference(
  pref: UserPreferenceDto,
): AiRecommendInput {
  return {
    goal: "awareness",
    target: "mass",
    budgetMaxMan: mapBudget(pref.budgetRange),
    region: regionFromIndustries(pref.industries),
    industry: mapIndustry(pref.industries),
    type: "all",
    minVisibility: 0,
    minDailyFootTraffic: 0,
  };
}

export function recommendMediaForPreference(
  pref: UserPreferenceDto,
  catalog: readonly MediaItem[],
  limit = 3,
): MediaItem[] {
  if (!needsIndustrySteps(pref.onboardingRole)) {
    return catalog.filter((m) => m.price > 0).slice(0, limit);
  }

  const input = buildRecommendInputFromPreference(pref);
  const scored = recommendMedia(input, catalog, catalog);
  return scored.slice(0, limit).map((s) => s.item);
}
