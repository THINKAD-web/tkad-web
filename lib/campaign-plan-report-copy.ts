/**
 * CampaignPlan `brief` Json 컬럼에 `reportCopy`·`onlineRecommend` 를 함께
 * 저장한다. 별도 DB 컬럼·마이그레이션 없음 — 기존 행은 키 없음 → empty state.
 */

import type {
  CampaignPlanBrief,
  CampaignPlanOnlineRecommendSnapshot,
} from "@/lib/campaign-plan-schema";
import {
  isEmptyPlannerReportCopy,
  parsePlannerReportCopyState,
  serializePlannerReportCopyState,
  type PlannerReportCopyState,
} from "@/lib/planner-report-export/report-copy-state";

type StoredBriefJson = CampaignPlanBrief & {
  reportCopy?: unknown;
  onlineRecommend?: unknown;
};

/** 저장된 JSON의 onlineRecommend — 형태만 느슨하게 확인(저장 시점 값 그대로 신뢰) */
function parseStoredOnlineRecommend(
  raw: unknown,
): CampaignPlanOnlineRecommendSnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Partial<CampaignPlanOnlineRecommendSnapshot>;
  if (!Array.isArray(o.channels)) return null;
  return {
    totalBudgetWon: typeof o.totalBudgetWon === "number" ? o.totalBudgetWon : 0,
    channels: o.channels,
    excludedForBudget: Array.isArray(o.excludedForBudget) ? o.excludedForBudget : [],
  };
}

export function unpackCampaignPlanBriefJson(json: unknown): {
  brief: CampaignPlanBrief;
  reportCopy: PlannerReportCopyState | null;
  onlineRecommend: CampaignPlanOnlineRecommendSnapshot | null;
} {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return {
      brief: (json ?? {}) as CampaignPlanBrief,
      reportCopy: null,
      onlineRecommend: null,
    };
  }
  const raw = json as StoredBriefJson;
  const { reportCopy: rawCopy, onlineRecommend: rawOnline, ...briefRest } = raw;
  const brief = briefRest as CampaignPlanBrief;
  const onlineRecommend = parseStoredOnlineRecommend(rawOnline);
  if (rawCopy == null) {
    return { brief, reportCopy: null, onlineRecommend };
  }
  const reportCopy = parsePlannerReportCopyState(rawCopy);
  return {
    brief,
    reportCopy: isEmptyPlannerReportCopy(reportCopy) ? null : reportCopy,
    onlineRecommend,
  };
}

export function packCampaignPlanBriefJson(
  brief: CampaignPlanBrief,
  reportCopy?: PlannerReportCopyState | null,
  onlineRecommend?: CampaignPlanOnlineRecommendSnapshot | null,
): unknown {
  const hasCopy = Boolean(reportCopy && !isEmptyPlannerReportCopy(reportCopy));
  if (!hasCopy && !onlineRecommend) {
    return brief;
  }
  return {
    ...brief,
    ...(hasCopy ? { reportCopy: serializePlannerReportCopyState(reportCopy!) } : {}),
    ...(onlineRecommend ? { onlineRecommend } : {}),
  };
}
