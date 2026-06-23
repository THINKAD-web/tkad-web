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
  /** brand·local 등 — 보고서 참고용 자유 목표 설명 */
  goalReferenceNote?: string | null;
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

function withGoalReferenceNote(
  base: PlannerGoalFollowUp,
  raw: PlannerGoalFollowUp,
): PlannerGoalFollowUp {
  const note = raw.goalReferenceNote?.trim() || null;
  return note ? { ...base, goalReferenceNote: note } : base;
}

/** 목표별 유효 필드만 남김 */
export function normalizeFollowUpForGoal(
  goal: PlannerCampaignGoal | null,
  raw: PlannerGoalFollowUp,
): PlannerGoalFollowUp {
  const d = defaultFollowUpForGoal(goal);
  switch (goal) {
    case "launch":
      return withGoalReferenceNote(
        {
          launchFocusWeeks: raw.launchFocusWeeks ?? d.launchFocusWeeks ?? null,
        },
        raw,
      );
    case "local":
      return withGoalReferenceNote({}, raw);
    case "event":
      return withGoalReferenceNote(
        {
          eventDurationDays: raw.eventDurationDays ?? d.eventDurationDays ?? null,
        },
        raw,
      );
    case "sales":
      return withGoalReferenceNote(
        {
          conversionChannel:
            raw.conversionChannel ?? d.conversionChannel ?? null,
          conversionKpi: raw.conversionKpi?.trim() || null,
        },
        raw,
      );
    default:
      return withGoalReferenceNote({}, raw);
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

/** 보고서·PDF·요약 카드용 목표 맞춤 입력 라인 */
export function buildGoalFollowUpReportLines(
  goal: PlannerCampaignGoal | null,
  followUp: PlannerGoalFollowUp,
  isKo: boolean,
): string[] {
  const lines: string[] = [];
  const f = followUp;

  if (goal === "launch" && f.launchFocusWeeks != null) {
    lines.push(
      isKo
        ? `집중 기간 · 런칭 후 ${f.launchFocusWeeks}주`
        : `Focus · ${f.launchFocusWeeks} weeks post-launch`,
    );
  }
  if (goal === "event" && f.eventDurationDays != null) {
    lines.push(
      isKo
        ? `행사 기간 · ${f.eventDurationDays}일`
        : `Event span · ${f.eventDurationDays} days`,
    );
  }
  if (goal === "sales" && f.conversionChannel) {
    const ch =
      f.conversionChannel === "store"
        ? isKo
          ? "매장 방문"
          : "in-store"
        : f.conversionChannel === "online"
          ? isKo
            ? "온라인 전환"
            : "online"
          : isKo
            ? "매장+온라인"
            : "store + online";
    lines.push(
      isKo ? `유도 방향 · ${ch}` : `Conversion focus · ${ch}`,
    );
  }

  const kpi = formatConversionKpiForReport(f.conversionKpi, isKo);
  if (goal === "sales" && kpi) {
    lines.push(isKo ? `목표 (참고) · ${kpi}` : `Goal (reference) · ${kpi}`);
  }

  const note = f.goalReferenceNote?.trim();
  if (note && goal !== "sales") {
    lines.push(isKo ? `목표 (참고) · ${note}` : `Goal (reference) · ${note}`);
  } else if (note && goal === "sales" && !kpi) {
    lines.push(isKo ? `목표 (참고) · ${note}` : `Goal (reference) · ${note}`);
  }

  return lines;
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
