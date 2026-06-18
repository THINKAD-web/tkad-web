import {
  getPlanCart,
  planCartMonthlyTotal,
  PLAN_CART_GOAL_OPTIONS,
  type PlanCart,
} from "@/lib/plan-cart";
import { mapPlanCartGoalToPlanner } from "@/lib/plan-cart-planner-bridge";
import type {
  ContactBudgetV2,
  ContactCampaignGoal,
} from "@/lib/contact-lead-schema";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";

const PLAN_CART_GOAL_TO_CONTACT: Record<string, ContactCampaignGoal> = {
  brand: "brand_awareness",
  launch: "product_launch",
  event: "event_promo",
  sales: "store_traffic",
  local: "store_traffic",
  brand_awareness: "brand_awareness",
  product_launch: "product_launch",
  conversion: "store_traffic",
};

export function planCartGoalToContactGoals(
  goal?: string,
): ContactCampaignGoal[] {
  if (!goal) return [];
  const mapped = PLAN_CART_GOAL_TO_CONTACT[goal];
  return mapped ? [mapped] : ["other"];
}

/** plan cart 월 총액(원) → contact 예산 구간 */
export function planCartBudgetToContactBudgetV2(
  monthlyWon: number,
): ContactBudgetV2 {
  const monthlyManwon = Math.round(monthlyWon / 10_000);
  if (monthlyManwon <= 0) return "undecided";
  if (monthlyManwon < 500) return "under_5m";
  if (monthlyManwon < 1000) return "5m_10m";
  if (monthlyManwon < 3000) return "10m_30m";
  return "over_30m";
}

function goalLabel(goal: string | undefined, isKo: boolean): string {
  if (!goal) return isKo ? "미정" : "TBD";
  const plannerKey = mapPlanCartGoalToPlanner(goal);
  const lookup = plannerKey ?? goal;
  const found = PLAN_CART_GOAL_OPTIONS.find((g) => g.value === lookup);
  if (!found) return goal;
  return isKo ? found.ko : found.en;
}

function formatManwon(price: number, isKo: boolean): string {
  if (price <= 0) return isKo ? "문의" : "Inquire";
  return formatCatalogPriceFieldWon(price, isKo ? "ko-KR" : "en-US");
}

export function buildPlanCartContactMessage(
  cart: PlanCart = getPlanCart(),
  isKo: boolean,
): string {
  const monthly = planCartMonthlyTotal(cart);
  const duration = cart.duration ?? 1;
  const periodTotal = monthly * duration;
  const lines = cart.items.map((item, idx) => {
    const price = formatManwon(item.price, isKo);
    return isKo
      ? `${idx + 1}. ${item.mediaName} (${price}/월)`
      : `${idx + 1}. ${item.mediaName} (${price}/mo)`;
  });

  if (isKo) {
    return [
      "[플랜 견적 요청]",
      "선택 매체:",
      ...lines,
      "",
      `캠페인 목표: ${goalLabel(cart.campaignGoal, true)}`,
      `집행 기간: ${duration}개월`,
      `월 총 예산: ${formatManwon(monthly, true)}`,
      `기간 총 예산: ${formatManwon(periodTotal, true)} (VAT 별도)`,
    ].join("\n");
  }

  return [
    "[Plan quote request]",
    "Selected media:",
    ...lines,
    "",
    `Campaign goal: ${goalLabel(cart.campaignGoal, false)}`,
    `Duration: ${duration} month(s)`,
    `Monthly total: ${formatManwon(monthly, false)}`,
    `Period total: ${formatManwon(periodTotal, false)} (VAT excl.)`,
  ].join("\n");
}

export function planCartSummaryLines(
  cart: PlanCart = getPlanCart(),
  isKo: boolean,
): string[] {
  return cart.items.map(
    (item, idx) => `${idx + 1}. ${item.mediaName}`,
  );
}
