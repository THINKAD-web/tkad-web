import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import { normalizeCampaignGoal } from "@/lib/planner/normalize-campaign-goal";
import type { ProposalGoal } from "@/lib/proposal/types";

const GOAL_TITLE_KEY: Record<
  NonNullable<PlannerCampaignGoal>,
  string
> = {
  brand: "goalBrand",
  launch: "goalLaunch",
  event: "goalEvent",
  sales: "goalSales",
  local: "goalLocal",
};

export function plannerGoalTitleKey(goal: PlannerCampaignGoal | null): string | null {
  if (!goal) return null;
  return GOAL_TITLE_KEY[goal];
}

/** 플래너 레거시 목표 → 제안서 goal enum */
export function plannerGoalToProposalGoal(
  goal: PlannerCampaignGoal | null,
): ProposalGoal {
  const { funnel, tags } = normalizeCampaignGoal(goal);
  if (funnel === "conversion") return "conversion";
  if (funnel === "consideration" || tags.includes("event")) return "event";
  return "awareness";
}

/** 제안서 goal → 플래너 저장 키 (launch/local 손실 방지) */
export function proposalGoalToPlanner(goal: ProposalGoal): PlannerCampaignGoal {
  return normalizeCampaignGoal(goal).displayKey;
}

export function parsePlannerBudgetManwon(budget: string): number {
  const digits = budget.replace(/\D/g, "");
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 100) return 3000;
  return n;
}

export function plannerPeriodDates(months: number): {
  startDate: string;
  endDate: string;
} {
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + Math.max(1, months));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
