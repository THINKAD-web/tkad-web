import type { MediaItem } from "@/lib/media-data";
import { resolveMediaIdFromMapPinId } from "@/lib/media-detail-map-markers";
import { buildPlannerReportPortfolioMap } from "@/lib/planner-report-portfolio-map";
import type { PlannerExportMapPin } from "@/lib/planner-report-export/types";

/** B-1 과 동일 규칙(폴백 제외) — PDF/PPT export 요청용 최소 핀 목록 */
export function buildExportMapPinsFromPortfolio(
  portfolio: readonly MediaItem[],
  isKo: boolean,
): PlannerExportMapPin[] {
  const { markers } = buildPlannerReportPortfolioMap(portfolio, isKo);
  return markers.map((m) => ({
    id: resolveMediaIdFromMapPinId(m.id),
    lat: m.lat,
    lng: m.lng,
    type: m.type,
    name: m.name.split(" · ")[0]?.trim() || m.name,
  }));
}
