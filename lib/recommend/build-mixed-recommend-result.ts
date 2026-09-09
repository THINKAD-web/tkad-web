/**
 * `/api/recommend` 전용 — OOH(`runRecommendation`) 결과 위에 온라인 믹스 orchestration.
 * DB/네트워크 접근 없음. `runRecommendation`/`matchMediaCatalog` 내부는 건드리지 않는다.
 */

import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import type { MatchedMedia } from "@/lib/matching-engine";
import type { MediaItem } from "@/lib/media-data";
import {
  resolveCrossChannelAllocation,
  type AllocationPolicyResult,
} from "@/lib/integrated/allocation-policy";
import { onlineCatalogFromBrief } from "@/lib/planner/brief/online-catalog-adapter";
import {
  recommendOnlineCatalogChannels,
  type OnlineCatalogRecommendResult,
} from "@/lib/planner/recommend-online-catalog";
import { recommendGoalToPlannerCampaignGoal } from "@/lib/recommend/recommend-report-adapter";
import { aiRecommendToOnlineCatalogInput } from "@/lib/recommend/ai-online-catalog-adapter";

export type RecommendOnlineStatus =
  | "ok"
  | "digital_budget_zero"
  | "no_online_catalog"
  | "no_relevant_channels"
  | "budget_too_small";

export async function buildMixedRecommendResult(opts: {
  aiInput: AiRecommendInput;
  oohRecommendations: MatchedMedia[];
  catalog: readonly MediaItem[];
  isKo: boolean;
}): Promise<{
  oohRecommendations: MatchedMedia[];
  online: OnlineCatalogRecommendResult | null;
  onlineStatus: RecommendOnlineStatus;
  allocation: AllocationPolicyResult;
}> {
  const { aiInput, oohRecommendations, catalog, isKo } = opts;

  const budgetTotalWon =
    aiInput.budgetMaxMan > 0 ? aiInput.budgetMaxMan * 10_000 : 0;
  const goal = recommendGoalToPlannerCampaignGoal(aiInput.goal);
  const allocation = resolveCrossChannelAllocation({
    budgetTotalWon,
    goal,
    digitalBudgetPct: aiInput.digitalBudgetPct,
  });

  if (allocation.digitalBudgetWon <= 0) {
    return {
      oohRecommendations,
      online: null,
      onlineStatus: "digital_budget_zero",
      allocation,
    };
  }

  if (onlineCatalogFromBrief(catalog).length === 0) {
    return {
      oohRecommendations,
      online: null,
      onlineStatus: "no_online_catalog",
      allocation,
    };
  }

  const onlineInput = aiRecommendToOnlineCatalogInput(
    aiInput,
    catalog,
    allocation.digitalBudgetWon,
  );
  const online = recommendOnlineCatalogChannels(onlineInput, isKo);

  if (online.noRelevantChannels) {
    return {
      oohRecommendations,
      online: null,
      onlineStatus: "no_relevant_channels",
      allocation,
    };
  }

  if (online.budgetTooSmall && online.platforms.length === 0) {
    return {
      oohRecommendations,
      online: null,
      onlineStatus: "budget_too_small",
      allocation,
    };
  }

  return {
    oohRecommendations,
    online,
    onlineStatus: "ok",
    allocation,
  };
}
