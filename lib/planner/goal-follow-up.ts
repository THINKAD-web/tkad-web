import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";

export type PlannerLaunchTiming = "asap" | "next_month" | "season";
export type PlannerConversionChannel = "store" | "online" | "both";

/** KPI 칩 키 — 추천·ROI에는 미반영, 보고서 참고용 */
export const CONVERSION_KPI_PRESETS = [
  "visits",
  "awareness",
  "inquiries",
] as const;
export type PlannerConversionKpiPreset =
  (typeof CONVERSION_KPI_PRESETS)[number];

export function isConversionKpiPreset(
  v: string | null | undefined,
): v is PlannerConversionKpiPreset {
  return (
    typeof v === "string" &&
    (CONVERSION_KPI_PRESETS as readonly string[]).includes(v)
  );
}

/** 로컬 목표 상권은 Step 2 `seoulZones` 칩으로 일원화 — follow-up 미사용 */
export type PlannerGoalFollowUp = {
  launchFocusWeeks?: number | null;
  /** @deprecated UI 미노출 — persist 호환만 */
  launchTiming?: PlannerLaunchTiming | null;
  /** @deprecated 기준점 없음 — persist 호환만, normalize 시 제거 */
  localRadiusKm?: number | null;
  localTradeArea?: string | null;
  eventDurationDays?: number | null;
  conversionChannel?: PlannerConversionChannel | null;
  /** preset 키(visits|awareness|inquiries) 또는 참고용 자유 입력 */
  conversionKpi?: string | null;
};

export const EMPTY_GOAL_FOLLOW_UP: PlannerGoalFollowUp = {};

export function defaultFollowUpForGoal(
  goal: PlannerCampaignGoal | null,
  _industryKey?: PlannerIndustryKey,
): PlannerGoalFollowUp {
  switch (goal) {
    case "launch":
      return { launchFocusWeeks: 4 };
    case "local":
      return {};
    case "event":
      return { eventDurationDays: 7 };
    case "sales":
      return { conversionChannel: "both", conversionKpi: null };
    default:
      return {};
  }
}

/** 목표별 유효 필드만 남김 */
export function normalizeFollowUpForGoal(
  goal: PlannerCampaignGoal | null,
  raw: PlannerGoalFollowUp,
): PlannerGoalFollowUp {
  const d = defaultFollowUpForGoal(goal);
  switch (goal) {
    case "launch":
      return {
        launchFocusWeeks: raw.launchFocusWeeks ?? d.launchFocusWeeks ?? null,
      };
    case "local":
      return {};
    case "event":
      return {
        eventDurationDays: raw.eventDurationDays ?? d.eventDurationDays ?? null,
      };
    case "sales":
      return {
        conversionChannel:
          raw.conversionChannel ?? d.conversionChannel ?? null,
        conversionKpi: raw.conversionKpi?.trim() || null,
      };
    default:
      return {};
  }
}

export function followUpGoalTags(
  goal: PlannerCampaignGoal | null,
  followUp: PlannerGoalFollowUp,
): string[] {
  const tags: string[] = [];
  if (goal === "launch") tags.push("launch");
  if (goal === "event") tags.push("event");
  if (goal === "local") tags.push("local");
  if (goal === "sales") tags.push("conversion");
  if (
    goal === "launch" &&
    followUp.launchFocusWeeks != null &&
    followUp.launchFocusWeeks <= 2
  ) {
    tags.push("burst");
  }
  if (goal === "sales") {
    if (followUp.conversionChannel === "online") tags.push("digital");
    if (followUp.conversionChannel === "store") tags.push("store");
  }
  return tags;
}

export function followUpKpiBoost(
  goal: PlannerCampaignGoal | null,
  followUp: PlannerGoalFollowUp,
): number {
  if (goal === "launch" && followUp.launchFocusWeeks != null) {
    if (followUp.launchFocusWeeks <= 2) return 0.06;
    if (followUp.launchFocusWeeks <= 4) return 0.03;
  }
  if (goal === "sales" && followUp.conversionChannel === "both") return 0.04;
  if (goal === "event" && (followUp.eventDurationDays ?? 0) >= 14) return 0.03;
  return 0;
}

/** 보고서·PDF용 KPI 라벨 (참고용) */
export function formatConversionKpiForReport(
  kpi: string | null | undefined,
  isKo: boolean,
): string | null {
  const v = kpi?.trim();
  if (!v) return null;
  if (isConversionKpiPreset(v)) {
    const mapKo: Record<PlannerConversionKpiPreset, string> = {
      visits: "방문 늘리기",
      awareness: "인지도 높이기",
      inquiries: "문의·상담 늘리기",
    };
    const mapEn: Record<PlannerConversionKpiPreset, string> = {
      visits: "More store visits",
      awareness: "Brand awareness",
      inquiries: "More inquiries",
    };
    return isKo ? mapKo[v] : mapEn[v];
  }
  return v;
}
