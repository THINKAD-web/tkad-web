import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";

/** 공유 가능한 매체 비교 페이지 URL (`/[locale]/media/compare`) */
export function buildMediaCompareHref(ids: string[]): string {
  const trimmed = ids
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, COMPARE_MAX_ITEMS);
  if (trimmed.length === 0) return "/media/compare";
  return `/media/compare?ids=${trimmed.join(",")}`;
}
