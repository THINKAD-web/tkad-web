import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";

export type PlannerLaunchTiming = "asap" | "next_month" | "season";
export type PlannerConversionChannel = "store" | "online" | "both";

/** Step 2 조건부 후속 — 전부 optional (미입력 허용) */
export type PlannerGoalFollowUp = {
  launchFocusWeeks?: number | null;
  launchTiming?: PlannerLaunchTiming | null;
  localRadiusKm?: number | null;
  localTradeArea?: string | null;
  eventDurationDays?: number | null;
  conversionChannel?: PlannerConversionChannel | null;
  conversionKpi?: string | null;
};

export const EMPTY_GOAL_FOLLOW_UP: PlannerGoalFollowUp = {};

export function defaultFollowUpForGoal(
  goal: PlannerCampaignGoal | null,
  _industryKey?: PlannerIndustryKey,
): PlannerGoalFollowUp {
  switch (goal) {
    case "launch":
      return { launchFocusWeeks: 4, launchTiming: "asap" };
    case "local":
      return { localRadiusKm: 3, localTradeArea: null };
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
        launchTiming: raw.launchTiming ?? d.launchTiming ?? null,
      };
    case "local":
      return {
        localRadiusKm: raw.localRadiusKm ?? d.localRadiusKm ?? null,
        localTradeArea: raw.localTradeArea?.trim() || null,
      };
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
  if (followUp.launchFocusWeeks != null && followUp.launchFocusWeeks <= 2) {
    tags.push("burst");
  }
  if (followUp.conversionChannel === "online") tags.push("digital");
  if (followUp.conversionChannel === "store") tags.push("store");
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
