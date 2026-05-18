import type { SavedPlannerPlanJson } from "@/lib/planner/contact-prefill";
import { normalizePlannerBudgetManwon } from "@/lib/planner/contact-prefill";

const GOAL_LABEL: Record<string, { ko: string; en: string }> = {
  brand: { ko: "브랜드 인지", en: "Brand awareness" },
  launch: { ko: "상품 런칭", en: "Product launch" },
  event: { ko: "이벤트·프로모", en: "Event promo" },
  sales: { ko: "매출·방문", en: "Sales & visits" },
  local: { ko: "로컬 홍보", en: "Local promo" },
};

export type PlannerPlanSummary = {
  title: string;
  budgetManwon: number;
  mediaCount: number;
};

export function summarizeSavedPlannerPlan(
  plan: SavedPlannerPlanJson,
  isKo: boolean,
  createdAt?: string,
): PlannerPlanSummary {
  const mediaCount = plan.campaignMediaIds?.length ?? 0;
  const budgetManwon = normalizePlannerBudgetManwon(plan.budget);
  const goal = plan.campaignGoal
    ? GOAL_LABEL[plan.campaignGoal]?.[isKo ? "ko" : "en"]
    : null;
  const dateLabel =
    createdAt &&
    new Date(createdAt).toLocaleDateString(isKo ? "ko-KR" : "en-US", {
      month: "short",
      day: "numeric",
    });

  let title = goal ?? (isKo ? "미디어 플래너 플랜" : "Media planner plan");
  if (mediaCount > 0) {
    title += isKo ? ` · ${mediaCount}개 매체` : ` · ${mediaCount} media`;
  }
  if (!goal && dateLabel) {
    title = isKo ? `플래너 플랜 ${dateLabel}` : `Planner plan ${dateLabel}`;
  }

  return { title, budgetManwon, mediaCount };
}
