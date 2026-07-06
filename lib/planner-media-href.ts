/** 찜 목록 등에서 AI 플래너로 선택 매체를 전달 */
export function buildPlannerHrefWithMediaIds(
  mediaIds: string[],
  opts?: { unitsByMediaId?: Record<string, number> },
): string {
  const ids = mediaIds.filter(Boolean);
  if (ids.length === 0) return "/planner";
  const q = new URLSearchParams();
  q.set("mediaIds", ids.join(","));
  if (ids.length === 1 && opts?.unitsByMediaId) {
    const u = opts.unitsByMediaId[ids[0]!];
    if (u != null && u > 1) q.set("units", String(Math.round(u)));
  }
  return `/planner?${q.toString()}`;
}
