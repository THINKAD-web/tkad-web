/**
 * `onlineSpec.bestFor`는 `targetingOptions`와 달리 자유 서술형 한국어 문구다
 * (예: "런칭 초기", "재구매·장바구니 이탈자 유도"). 구조화 태그가 아니라서
 * 키워드 포함 여부로 사용자 목표(`PlannerCampaignGoal`)와의 매칭 정도만 추정한다.
 */
import type { PlannerCampaignGoal } from "@/lib/planner-logic";

const GOAL_KEYWORDS_KO: Record<PlannerCampaignGoal, string[]> = {
  brand: ["인지도", "브랜드", "인지"],
  launch: ["런칭", "신규", "초기", "오픈"],
  event: ["프로모션", "이벤트", "쿠폰", "시즌"],
  sales: ["전환", "구매", "재구매", "장바구니", "판매", "매출"],
  local: ["지역", "매장", "방문", "로컬", "오프라인"],
};

/** bestFor 문구 중 사용자 목표 키워드와 겹치는 항목 수 (0 이상) */
export function bestForGoalMatchCount(
  bestFor: readonly string[] | null | undefined,
  goal: PlannerCampaignGoal | null,
): number {
  if (!goal || !bestFor?.length) return 0;
  const keywords = GOAL_KEYWORDS_KO[goal] ?? [];
  if (keywords.length === 0) return 0;
  let count = 0;
  for (const item of bestFor) {
    if (keywords.some((kw) => item.includes(kw))) count += 1;
  }
  return count;
}
