/**
 * AI 플래너(`/recommend`) 세션 재진입 모달 판단 — 상세플래너 `brief-session-logic` 패턴.
 */

import type { PlanCart } from "@/lib/plan-cart";
import type { RecommendSessionSnapshot } from "@/lib/recommend/recommend-session-persist";

/** AI 플래너에서 담은 카트 항목만 — search/map 등 다른 경로 카트는 재진입 판단에서 제외 */
export function countAiRecommendPlanCartItems(
  cart: Pick<PlanCart, "items">,
): number {
  return cart.items.filter((item) => item.addedFrom === "ai_recommend").length;
}

/** L-2 대응: 재진입 시 이어하기 모달을 띄울지 */
export function shouldPromptRecommendResumeSession(params: {
  alreadyPrompted: boolean;
  skipSessionRestore: boolean;
  sessionSnapshot: RecommendSessionSnapshot | null;
  aiRecommendPlanCartCount: number;
  /** 「새로 시작」 직후 — AI 카트·세션이 없으면 팝업 억제 */
  resumeFreshStartAt?: number | null;
}): boolean {
  if (params.skipSessionRestore) return false;
  if (params.alreadyPrompted) return false;
  if (
    params.resumeFreshStartAt != null &&
    params.aiRecommendPlanCartCount === 0 &&
    !params.sessionSnapshot
  ) {
    return false;
  }
  if (params.aiRecommendPlanCartCount >= 1) return true;
  if (!params.sessionSnapshot) return false;
  return (
    params.sessionSnapshot.scored.length > 0 ||
    params.sessionSnapshot.phase === "noResults"
  );
}

/** 프롬프트에 표시할 매체 수 — AI 카트 우선, 없으면 세션 추천 목록 */
export function recommendResumeMediaCount(params: {
  aiRecommendPlanCartCount: number;
  sessionSnapshot: RecommendSessionSnapshot | null;
}): number {
  if (params.aiRecommendPlanCartCount >= 1) {
    return params.aiRecommendPlanCartCount;
  }
  return params.sessionSnapshot?.scored.length ?? 0;
}
