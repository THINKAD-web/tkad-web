import type { PlannerCampaignGoal } from "@/lib/planner/types";
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

export function plannerGoalToProposalGoal(
  goal: PlannerCampaignGoal | null,
): ProposalGoal {
  if (goal === "sales") return "conversion";
  if (goal === "event") return "event";
  return "awareness";
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
