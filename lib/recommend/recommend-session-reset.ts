"use client";

import { getPlanCart, replacePlanCart } from "@/lib/plan-cart";
import { resetAllPlannerReportCopyFields } from "@/lib/planner/reset-planner-session";
import { clearRecommendSessionSnapshot } from "@/lib/recommend/recommend-session-persist";

/** AI 플래너에서 담은 매체만 제거 — 다른 경로(map/search) 카트는 유지 */
export function clearRecommendAiPlanCartItems(): void {
  const cart = getPlanCart();
  const items = cart.items.filter((item) => item.addedFrom !== "ai_recommend");
  if (items.length === cart.items.length) return;
  replacePlanCart({
    ...cart,
    items,
    updatedAt: new Date().toISOString(),
  });
}

/** 「새로 시작」 — 세션·report copy·AI 카트 항목 초기화 */
export function resetRecommendSessionState(): void {
  clearRecommendSessionSnapshot();
  resetAllPlannerReportCopyFields();
  clearRecommendAiPlanCartItems();
}
