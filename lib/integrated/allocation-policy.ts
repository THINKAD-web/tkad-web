import type { PlannerCampaignGoal } from "@/lib/planner/types";

export type AllocationPolicyResult = {
  oohBudgetWon: number;
  digitalBudgetWon: number;
  oohBudgetPct: number;
  digitalBudgetPct: number;
  policy: "user_override" | "goal_default_v1";
};

const GOAL_DEFAULT_DIGITAL_PCT: Record<PlannerCampaignGoal, number> = {
  local: 25,
  brand: 35,
  launch: 30,
  event: 40,
  sales: 45,
};

/** Cross-channel budget split — user slider wins over goal defaults (§11). */
export function resolveCrossChannelAllocation(opts: {
  budgetTotalWon: number;
  goal: PlannerCampaignGoal;
  digitalBudgetPct?: number;
}): AllocationPolicyResult {
  const { budgetTotalWon, goal, digitalBudgetPct } = opts;

  let pct: number;
  let policy: AllocationPolicyResult["policy"];
  if (
    digitalBudgetPct != null &&
    Number.isFinite(digitalBudgetPct) &&
    digitalBudgetPct >= 0 &&
    digitalBudgetPct <= 100
  ) {
    pct = Math.round(digitalBudgetPct);
    policy = "user_override";
  } else {
    pct = GOAL_DEFAULT_DIGITAL_PCT[goal] ?? 30;
    policy = "goal_default_v1";
  }

  const digitalBudgetWon = Math.round((budgetTotalWon * pct) / 100);
  const oohBudgetWon = budgetTotalWon - digitalBudgetWon;
  const oohBudgetPct = 100 - pct;

  return {
    oohBudgetWon,
    digitalBudgetWon,
    oohBudgetPct,
    digitalBudgetPct: pct,
    policy,
  };
}
