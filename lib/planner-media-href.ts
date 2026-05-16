/** 찜 목록 등에서 AI 플래너로 선택 매체를 전달 */
export function buildPlannerHrefWithMediaIds(mediaIds: string[]): string {
  const ids = mediaIds.filter(Boolean);
  if (ids.length === 0) return "/planner";
  return `/planner?mediaIds=${encodeURIComponent(ids.join(","))}`;
}
