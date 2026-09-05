/**
 * O-1 — 통합 브리프 → integrated mix / 디지털 추천 어댑터.
 * lib/integrated/*, recommend-digital.ts 재사용을 위한 필드 매핑.
 */

import { buildIntegratedMixRequest } from "@/lib/integrated/build-mix-request";
import type { IntegratedMixRequest } from "@/lib/integrated/schemas";
import { sidoCodesToBrowseMainIds } from "@/lib/planner/brief/regions";
import {
  flightDays,
  totalBudgetWon,
  type BriefAgeBand,
  type BriefGoal,
  type BriefIndustry,
  type CampaignBriefInput,
} from "@/lib/planner/brief/types";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerAgeKey, PlannerIndustryKey } from "@/lib/planner/types";

/**
 * "digital_only" — 온라인 플래너 자체 재구현(PART3) 1단계. 타입·store 로직
 * 레벨까지만 이번에 준비하고, 토글 UI(`BRIEF_CHANNEL_MODES` 노출)는 브리프
 * 스텝2·3의 OOH 전용 필드 조정과 함께 3-5(UI 교체)에서 노출한다.
 */
export type BriefChannelMode = "ooh_only" | "ooh_digital" | "digital_only";

/** 채널 토글 UI(`brief-step-one.tsx`)에 노출되는 모드만 — "digital_only"는 3-5에서 추가 */
export const BRIEF_CHANNEL_MODES: readonly BriefChannelMode[] = [
  "ooh_only",
  "ooh_digital",
] as const;

const GOAL_TO_PLANNER: Record<BriefGoal, PlannerCampaignGoal> = {
  awareness: "brand",
  consideration: "launch",
  conversion: "sales",
};

const INDUSTRY_TO_PLANNER: Record<BriefIndustry, PlannerIndustryKey> = {
  fb: "indFb",
  retail: "indRetail",
  tech: "indTech",
  finance: "indFinance",
  ent: "indEnt",
  other: "indOther",
};

const AGE_TO_PLANNER: Partial<Record<BriefAgeBand, PlannerAgeKey>> = {
  "20s": "age20s",
  "30s": "age30s",
  "40s": "age40s",
  "50s+": "age50plus",
};

export function briefGoalToPlanner(goal: BriefGoal | null): PlannerCampaignGoal {
  if (goal == null) return "brand";
  return GOAL_TO_PLANNER[goal];
}

export function briefIndustryToPlanner(
  industry: BriefIndustry | null,
): PlannerIndustryKey {
  if (industry == null) return "indOther";
  return INDUSTRY_TO_PLANNER[industry];
}

export function briefAgeBandsToPlannerKeys(
  ageBands: readonly BriefAgeBand[],
): PlannerAgeKey[] {
  const out: PlannerAgeKey[] = [];
  for (const band of ageBands) {
    const key = AGE_TO_PLANNER[band];
    if (key && !out.includes(key)) out.push(key);
  }
  return out;
}

/** 브리프 regionCodes → integrated regions (browse main id). 빈 배열이면 seoul 기본 */
export function briefRegionsForIntegrated(
  regionCodes: readonly string[],
): string[] {
  const ids = sidoCodesToBrowseMainIds(regionCodes);
  return ids.length > 0 ? ids : ["seoul"];
}

export function briefBudgetMan(brief: CampaignBriefInput): number {
  return Math.max(0, Math.round(totalBudgetWon(brief) / 10_000));
}

export function briefPeriodMonths(brief: CampaignBriefInput): number {
  const days = flightDays(brief);
  if (days == null) return 1;
  return Math.max(1, Math.min(12, Math.round(days / 30)));
}

export function buildBriefIntegratedMixRequest(opts: {
  brief: CampaignBriefInput;
  digitalBudgetPct: number;
  selectedOohMediaIds: string[];
  locale: "ko" | "en";
}): IntegratedMixRequest | null {
  const budgetMan = briefBudgetMan(opts.brief);
  if (budgetMan <= 0) return null;

  return buildIntegratedMixRequest({
    campaignGoal: briefGoalToPlanner(opts.brief.goal),
    industryKey: briefIndustryToPlanner(opts.brief.industry),
    regions: briefRegionsForIntegrated(opts.brief.regionCodes),
    ageKeys: briefAgeBandsToPlannerKeys(opts.brief.ageBands),
    budgetMan,
    months: briefPeriodMonths(opts.brief),
    digitalBudgetPct: opts.digitalBudgetPct,
    selectedOohMediaIds: opts.selectedOohMediaIds,
    locale: opts.locale,
  });
}

export function isBriefChannelMode(v: unknown): v is BriefChannelMode {
  return v === "ooh_only" || v === "ooh_digital";
}
