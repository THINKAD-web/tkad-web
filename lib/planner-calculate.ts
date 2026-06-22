/**
 * 플래너 효과·예산 계산 로직 (대시보드·보고서 공용).
 * 구현은 `planner-logic`에 두고 여기서 재노출합니다.
 */
export {
  type PlannerCampaignGoal,
  type PlannerCategory,
  type PlannerMapRegion,
  type PlannerMetrics,
  PLANNER_MAP_REGIONS,
  filterPlannerMediaMulti,
  countPlannerMediaByRegion,
  computePlannerMetrics,
  selectPlannerPortfolio,
  selectPlannerPortfolioFromMatching,
  computeBudgetBlurbParts,
  portfolioDailyByCategory,
  estimateCpmByCategory,
  budgetSplitByCategory,
  reachSplitForGoal,
  comparePlansByDuration,
  portfolioFromManualSelection,
  resolvePlannerPortfolio,
  orderPlannerSelectedMedia,
  computePlannerPortfolioBudgetStatus,
  PLANNER_AUTO_PORTFOLIO_MAX_ITEMS,
  PLANNER_AUTO_PORTFOLIO_POOL_SIZE,
} from "@/lib/planner-logic";
