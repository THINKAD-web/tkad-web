import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";
import { buildPlannerReportPortfolioMap } from "@/lib/planner-report-portfolio-map";
import type { MediaItem } from "@/lib/media-data";

/** 다운로드·미리보기 공통 — 선택 섹션 on/off (export body 전용, payload 오염 없음) */
export const PLANNER_REPORT_SECTION_KEYS = [
  "map",
  "recommend",
  "subdivision",
  "region",
  "performance",
  "extraSections",
] as const;

export type PlannerReportSectionKey = (typeof PLANNER_REPORT_SECTION_KEYS)[number];

export type PlannerReportSectionVisibility = Partial<
  Record<PlannerReportSectionKey, boolean>
>;

export const PLANNER_REPORT_SECTION_VISIBILITY_KEY =
  "tkad_planner_report_section_visibility";

const DEFAULT_VISIBILITY: Record<PlannerReportSectionKey, boolean> = {
  map: true,
  recommend: true,
  subdivision: true,
  region: true,
  performance: true,
  extraSections: true,
};

export function defaultPlannerReportSectionVisibility(): Record<
  PlannerReportSectionKey,
  boolean
> {
  return { ...DEFAULT_VISIBILITY };
}

export function readPlannerReportSectionVisibility(): Record<
  PlannerReportSectionKey,
  boolean
> {
  const base = defaultPlannerReportSectionVisibility();
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(PLANNER_REPORT_SECTION_VISIBILITY_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as PlannerReportSectionVisibility;
    for (const key of PLANNER_REPORT_SECTION_KEYS) {
      if (typeof parsed[key] === "boolean") {
        base[key] = parsed[key]!;
      }
    }
  } catch {
    /* ignore */
  }
  return base;
}

export function writePlannerReportSectionVisibility(
  visibility: PlannerReportSectionVisibility,
): void {
  try {
    localStorage.setItem(
      PLANNER_REPORT_SECTION_VISIBILITY_KEY,
      JSON.stringify(visibility),
    );
  } catch {
    /* ignore */
  }
}

/** 미지정·true → 표시. false 만 숨김 */
export function sectionVisible(
  visibility: PlannerReportSectionVisibility | undefined,
  key: PlannerReportSectionKey,
): boolean {
  return visibility?.[key] !== false;
}

export type PlannerReportSectionAvailability = Record<
  PlannerReportSectionKey,
  { available: boolean; reasonKo?: string; reasonEn?: string }
>;

export function computePlannerReportSectionAvailability(args: {
  payload: PlannerReportExportPayload;
  mapPortfolio?: readonly MediaItem[];
  isKo: boolean;
}): PlannerReportSectionAvailability {
  const { payload: p, mapPortfolio, isKo } = args;
  const noData = isKo ? "데이터 없음" : "No data";

  const mapMarkers =
    mapPortfolio && mapPortfolio.length > 0
      ? buildPlannerReportPortfolioMap(mapPortfolio, isKo).markers.length
      : 0;

  const hasCharts =
    (p.charts?.budgetSplit?.length ?? 0) > 0 ||
    (p.charts?.browseBudgetSplit?.length ?? 0) > 0 ||
    (p.charts?.cpmBars?.length ?? 0) > 0 ||
    (p.charts?.reachSummary?.length ?? 0) > 0 ||
    Boolean(p.charts?.performanceGuide);

  return {
    map: {
      available: mapMarkers > 0,
      reasonKo: noData,
      reasonEn: noData,
    },
    recommend: {
      available: Boolean(p.recommendRationale),
      reasonKo: noData,
      reasonEn: noData,
    },
    subdivision: {
      available: (p.regionSubdivision?.breakdown.length ?? 0) >= 2,
      reasonKo: noData,
      reasonEn: noData,
    },
    region: {
      available: (p.regionBreakdown?.length ?? 0) > 0,
      reasonKo: noData,
      reasonEn: noData,
    },
    performance: {
      available: hasCharts,
      reasonKo: noData,
      reasonEn: noData,
    },
    extraSections: {
      available: (p.sections ?? []).some((s) => s.lines.length > 0),
      reasonKo: noData,
      reasonEn: noData,
    },
  };
}

/** region off 시 sections 에서 지역 텍스트 블록 제외 (PPT 잔존 방지) */
export function filterExportSections(
  sections: PlannerReportExportPayload["sections"],
  visibility: PlannerReportSectionVisibility | undefined,
): PlannerReportExportPayload["sections"] {
  const list = sections ?? [];
  if (sectionVisible(visibility, "extraSections") && sectionVisible(visibility, "region")) {
    return list;
  }
  const regionTitles = new Set([
    "지역별 예산·효과",
    "Budget & impact by region",
  ]);
  return list.filter((sec) => {
    if (!sectionVisible(visibility, "extraSections")) return false;
    if (!sectionVisible(visibility, "region") && regionTitles.has(sec.title)) {
      return false;
    }
    return sec.lines.length > 0;
  });
}

export function parseSectionVisibility(
  raw: unknown,
): PlannerReportSectionVisibility | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: PlannerReportSectionVisibility = {};
  for (const key of PLANNER_REPORT_SECTION_KEYS) {
    if (typeof o[key] === "boolean") {
      out[key] = o[key];
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
