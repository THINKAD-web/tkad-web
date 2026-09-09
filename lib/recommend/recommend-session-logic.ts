/**
 * AI 플래너(`/recommend`) 세션 재진입 모달 판단 — 상세플래너 `brief-session-logic` 패턴.
 */

import type { RecommendSessionSnapshot } from "@/lib/recommend/recommend-session-persist";

/** L-2 대응: 재진입 시 이어하기 모달을 띄울지 */
export function shouldPromptRecommendResumeSession(params: {
  alreadyPrompted: boolean;
  skipSessionRestore: boolean;
  sessionSnapshot: RecommendSessionSnapshot | null;
  planCartCount: number;
}): boolean {
  if (params.skipSessionRestore) return false;
  if (params.alreadyPrompted) return false;
  if (params.planCartCount >= 1) return true;
  if (!params.sessionSnapshot) return false;
  return (
    params.sessionSnapshot.scored.length > 0 ||
    params.sessionSnapshot.phase === "noResults"
  );
}

/** 프롬프트에 표시할 매체 수 — 카트 우선, 없으면 세션 추천 목록 */
export function recommendResumeMediaCount(params: {
  planCartCount: number;
  sessionSnapshot: RecommendSessionSnapshot | null;
}): number {
  if (params.planCartCount >= 1) return params.planCartCount;
  return params.sessionSnapshot?.scored.length ?? 0;
}
