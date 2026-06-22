import {
  matchesPlannerCategory,
  type PlannerCategory,
} from "@/lib/planner-logic";
import { matchesPlannerRegion } from "@/lib/planner/planner-regions";
import type { MediaItem } from "@/lib/media-data";

/** Step 4 AI 추천: 엄격 필터가 비어도 등록 매체가 보이도록 완화 풀 */
export function buildPlannerRecommendationCatalog(
  catalog: MediaItem[],
  filtered: MediaItem[],
  selectedRegions: ReadonlySet<string>,
  categories: ReadonlySet<PlannerCategory>,
): MediaItem[] {
  if (filtered.length > 0) return filtered;
  if (selectedRegions.size > 0) {
    const byRegion = catalog.filter((m) =>
      [...selectedRegions].some((r) => matchesPlannerRegion(m, r)),
    );
    if (byRegion.length > 0) return byRegion;
  }
  if (categories.size > 0) {
    const byCat = catalog.filter((m) =>
      [...categories].some((c) => matchesPlannerCategory(m, c)),
    );
    if (byCat.length > 0) return byCat;
  }
  return catalog;
}
