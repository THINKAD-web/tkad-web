/** 플래너 Claude 추천·제안 논리 — env 로만 켜짐 (기본 OFF). 등급 게이트 없음. */
export function isPlannerClaudeEnabled(): boolean {
  return process.env.PLANNER_RECOMMEND_USE_CLAUDE === "true";
}
