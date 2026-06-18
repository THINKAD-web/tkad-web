import type { PlannerCampaignGoal } from "@/lib/planner-logic";

export type PlannerCampaignGoalDef = {
  key: PlannerCampaignGoal;
  titleKey: string;
  descKey: string;
};

/** 플래너 Step 1 · 내 플랜 캠페인 목표 공통 정의 */
export const PLANNER_CAMPAIGN_GOAL_DEFS: readonly PlannerCampaignGoalDef[] = [
  { key: "brand", titleKey: "goalBrand", descKey: "goalBrandDesc" },
  { key: "launch", titleKey: "goalLaunch", descKey: "goalLaunchDesc" },
  { key: "event", titleKey: "goalEvent", descKey: "goalEventDesc" },
  { key: "sales", titleKey: "goalSales", descKey: "goalSalesDesc" },
  { key: "local", titleKey: "goalLocal", descKey: "goalLocalDesc" },
] as const;
