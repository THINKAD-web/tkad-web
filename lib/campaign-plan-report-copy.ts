/**
 * CampaignPlan `brief` Json 컬럼에 `reportCopy` 를 함께 저장한다.
 * 별도 DB 컬럼·마이그레이션 없음 — 기존 행은 키 없음 → empty state.
 */

import type { CampaignPlanBrief } from "@/lib/campaign-plan-schema";
import {
  isEmptyPlannerReportCopy,
  parsePlannerReportCopyState,
  serializePlannerReportCopyState,
  type PlannerReportCopyState,
} from "@/lib/planner-report-export/report-copy-state";

type StoredBriefJson = CampaignPlanBrief & {
  reportCopy?: unknown;
};

export function unpackCampaignPlanBriefJson(json: unknown): {
  brief: CampaignPlanBrief;
  reportCopy: PlannerReportCopyState | null;
} {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return {
      brief: (json ?? {}) as CampaignPlanBrief,
      reportCopy: null,
    };
  }
  const raw = json as StoredBriefJson;
  const { reportCopy: rawCopy, ...briefRest } = raw;
  const brief = briefRest as CampaignPlanBrief;
  if (rawCopy == null) {
    return { brief, reportCopy: null };
  }
  const reportCopy = parsePlannerReportCopyState(rawCopy);
  return {
    brief,
    reportCopy: isEmptyPlannerReportCopy(reportCopy) ? null : reportCopy,
  };
}

export function packCampaignPlanBriefJson(
  brief: CampaignPlanBrief,
  reportCopy?: PlannerReportCopyState | null,
): unknown {
  if (!reportCopy || isEmptyPlannerReportCopy(reportCopy)) {
    return brief;
  }
  return {
    ...brief,
    reportCopy: serializePlannerReportCopyState(reportCopy),
  };
}
