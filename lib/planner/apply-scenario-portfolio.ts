import type { MediaItem } from "@/lib/media-data";
import {
  filterPlannerMediaMulti,
  selectPlannerPortfolioFromMatching,
} from "@/lib/planner-logic";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";
import {
  isPlannerSeoulZoneKey,
  type PlannerSeoulZoneKey,
} from "@/lib/planner/seoul-zones";
import type { PlannerScenarioApplyPatch } from "@/lib/planner/scenario-types";
import { PLANNER_DEFAULT_CATEGORIES } from "@/lib/planner/types";

/** 시나리오 districtHints → 서울 상권 칩 (busan·jeju·seoul 등은 제외) */
export function districtHintsToSeoulZones(
  hints: readonly string[],
): PlannerSeoulZoneKey[] {
  const out: PlannerSeoulZoneKey[] = [];
  for (const h of hints) {
    if (isPlannerSeoulZoneKey(h) && !out.includes(h)) out.push(h);
  }
  return out;
}

/**
 * 시나리오 적용 패치 기준으로 필터·자동조합(knapsack 92%) 후 매체 ID 목록 반환.
 * catalog는 공개 DB 카탈로그(`fetchPublicMediaCatalog`)를 사용한다.
 */
export function resolveScenarioPortfolioMediaIds(
  catalog: readonly MediaItem[],
  patch: PlannerScenarioApplyPatch,
): string[] {
  const regions = patch.regions.length > 0 ? [...patch.regions] : ["seoul"];
  const categories =
    patch.categories.length > 0
      ? [...patch.categories]
      : [...PLANNER_DEFAULT_CATEGORIES];
  const regionSet = new Set(regions);
  const categorySet = new Set(categories);
  const seoulZones =
    patch.seoulZones ?? districtHintsToSeoulZones(patch.districtHints ?? []);
  const busanZones = patch.busanZones ?? [];
  const gyeonggiZones = patch.gyeonggiZones ?? [];

  const filtered = filterPlannerMediaMulti(
    catalog,
    regionSet,
    categorySet,
    seoulZones,
    busanZones,
    gyeonggiZones,
  );
  if (filtered.length === 0) return [];

  const ctx: RecommendationContext = {
    goal: patch.campaignGoal ?? null,
    regions,
    seoulZones,
    busanZones,
    gyeonggiZones,
    categories,
    ageKeys: patch.ageKeys ?? [],
    industryKey: patch.industryKey ?? null,
    budgetMan: patch.budgetMan,
    months: patch.months,
    goalFollowUp: patch.goalFollowUp,
  };

  const portfolio = selectPlannerPortfolioFromMatching(
    [...filtered],
    ctx,
    patch.budgetMan,
    patch.months,
  );
  return portfolio.map((m) => m.id);
}
