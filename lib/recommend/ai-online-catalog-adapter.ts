/**
 * AI플래너(`/recommend`) 입력 → `recommendOnlineCatalogChannels()` SSOT 어댑터.
 * 계산 로직은 `briefToOnlineCatalogInput`과 동일 패턴 — 필드 매핑만.
 */

import type {
  AiRecommendInput,
  Industry,
  TargetAudience,
} from "@/lib/ai-media-recommend";
import type { MediaItem } from "@/lib/media-data";
import type { OnlineCatalogRecommendInput } from "@/lib/planner/recommend-online-catalog";
import type { BriefAgeBand, BriefIndustry } from "@/lib/planner/brief/types";
import { onlineCatalogFromBrief } from "@/lib/planner/brief/online-catalog-adapter";
import { recommendGoalToPlannerCampaignGoal } from "@/lib/recommend/recommend-report-adapter";

const AI_INDUSTRY_TO_BRIEF: Record<Industry, BriefIndustry> = {
  beauty: "retail",
  retail: "retail",
  fmcg: "retail",
  fintech: "finance",
  entertainment: "ent",
  auto: "other",
  other: "other",
};

export function aiIndustryToBriefIndustry(industry: Industry): BriefIndustry {
  return AI_INDUSTRY_TO_BRIEF[industry] ?? "other";
}

export function aiTargetToBriefAgeBands(
  target: TargetAudience,
): readonly BriefAgeBand[] {
  switch (target) {
    case "genz":
      return ["20s"];
    case "millennial":
      return ["20s", "30s"];
    case "family":
      return ["40s"];
    case "biz":
      return ["30s", "40s"];
    case "mass":
    default:
      return [];
  }
}

export function aiRecommendToOnlineCatalogInput(
  aiInput: AiRecommendInput,
  catalog: readonly MediaItem[],
  digitalBudgetWon: number,
): OnlineCatalogRecommendInput {
  return {
    goal: recommendGoalToPlannerCampaignGoal(aiInput.goal),
    industry: aiIndustryToBriefIndustry(aiInput.industry),
    ageBands: aiTargetToBriefAgeBands(aiInput.target),
    genders: [],
    budgetMan: Math.max(0, Math.round(digitalBudgetWon / 10_000)),
    catalog: onlineCatalogFromBrief(catalog),
  };
}
