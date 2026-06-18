import type { PlanCart } from "@/lib/plan-cart";
import type { PlannerStoreState } from "@/lib/planner/store";
import {
  PLANNER_BUDGET_MAX,
  PLANNER_BUDGET_MIN,
  type PlannerCampaignGoal,
} from "@/lib/planner/types";

export function mapPlanCartGoalToPlanner(
  goal?: string,
): PlannerCampaignGoal | null {
  if (!goal) return null;
  if (
    goal === "brand" ||
    goal === "launch" ||
    goal === "event" ||
    goal === "sales" ||
    goal === "local"
  ) {
    return goal;
  }
  switch (goal) {
    case "brand_awareness":
      return "brand";
    case "product_launch":
      return "launch";
    case "event":
      return "event";
    case "conversion":
      return "sales";
    default:
      return null;
  }
}

/** `tkad_plan_cart` → 플래너 store 필드 (기존 campaignMediaIds 를 교체) */
export function hydratePlannerFromPlanCart(
  cart: PlanCart,
): Partial<PlannerStoreState> {
  const monthlyManwon =
    cart.totalBudget != null && cart.totalBudget > 0
      ? Math.round(cart.totalBudget / 10_000)
      : null;

  const patch: Partial<PlannerStoreState> = {
    campaignMediaIds: cart.items.map((i) => i.mediaId),
    campaignGoal: mapPlanCartGoalToPlanner(cart.campaignGoal),
    mediaSelectionExplicit: true,
  };

  if (monthlyManwon != null) {
    patch.budget = String(
      Math.min(PLANNER_BUDGET_MAX, Math.max(PLANNER_BUDGET_MIN, monthlyManwon)),
    );
  }

  if (cart.duration != null && cart.duration > 0) {
    patch.months = cart.duration;
  }

  return patch;
}

/** 내 플랜 → 플래너 진입 URL (`from=plan` 1회성 hydrate 트리거) */
export function buildMyPlanPlannerHref(mediaIds: string[]): string {
  const ids = mediaIds.filter(Boolean);
  const params = new URLSearchParams({ from: "plan" });
  if (ids.length > 0) {
    params.set("mediaIds", ids.join(","));
  }
  return `/planner?${params.toString()}`;
}
