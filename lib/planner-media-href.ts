export function buildPlannerHrefWithMediaIds(mediaIds: string[]): string {
  const ids = mediaIds.filter(Boolean);
  if (ids.length === 0) return "/planner";
  return `/planner?mediaIds=${encodeURIComponent(ids.join(","))}`;
}
