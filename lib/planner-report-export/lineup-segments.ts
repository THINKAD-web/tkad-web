import type {
  PlannerExportMediaRow,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";

export type PortfolioLineupSegment = {
  regionLabel: string;
  categoryLabel: string;
  items: PlannerExportMediaRow[];
};

/** 화면·페이로드와 동일한 지역 → 유형 세그먼트. 없으면 flat 1세그먼트. */
export function buildPortfolioLineupSegments(
  p: Pick<PlannerReportExportPayload, "portfolio" | "portfolioGroups">,
): { grouped: boolean; segments: PortfolioLineupSegment[] } {
  const groups = p.portfolioGroups?.filter((g) =>
    g.categories.some((c) => c.items.length > 0),
  );
  if (!groups?.length) {
    return {
      grouped: false,
      segments: [
        { regionLabel: "", categoryLabel: "", items: p.portfolio },
      ],
    };
  }

  const segments: PortfolioLineupSegment[] = [];
  for (const group of groups) {
    for (const cat of group.categories) {
      if (cat.items.length > 0) {
        segments.push({
          regionLabel: group.regionLabel,
          categoryLabel: cat.categoryLabel,
          items: cat.items,
        });
      }
    }
  }
  return { grouped: true, segments };
}
