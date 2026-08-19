/**
 * PR-8-2 — 브리프 화면(MetricsPanel) ↔ export KPI 배지 시퀀스.
 */

import type { CampaignPlanSnapshot } from "@/lib/campaign-plan-schema";
import type { MediaItem } from "@/lib/media-data";
import { buildMixLines } from "@/lib/planner/brief/build-plan-snapshot";
import { calcMixMetrics } from "@/lib/planner/brief/mix-metrics";
import { briefToTargetSpec } from "@/lib/planner/brief/reach-adapter";
import {
  briefMixQuantities,
  type BriefReportPlan,
} from "@/lib/planner/brief/brief-report-adapter";
import { flightDays, type CampaignBriefInput } from "@/lib/planner/brief/types";
import {
  metricBasisToExportBadge,
  type ExportKpiBadgeKey,
  type PlannerExportBadgeKind,
} from "@/lib/planner-report-export/export-badge";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";

const EXPORT_KPI_ORDER: ExportKpiBadgeKey[] = [
  "impressions",
  "reach",
  "roi",
  "cpm",
];

/** 저장 스냅샷 dataQuality → export KPI 배지 (payload 와 동일 규칙) */
export function briefSnapshotExportKpiBadges(
  plan: BriefReportPlan,
): PlannerExportBadgeKind[] {
  const dq = plan.metrics.dataQuality;
  const badges: PlannerExportBadgeKind[] = [
    metricBasisToExportBadge(dq.totalImpressions),
    "pending",
    "pending",
  ];
  if (plan.metrics.mixCpmWon != null && dq.mixCpmWon != null) {
    badges.push(metricBasisToExportBadge(dq.mixCpmWon));
  }
  return badges;
}

/** live calcMixMetrics → 화면 MetricsPanel 과 동일 basis */
export function briefScreenExportKpiBadges(
  plan: BriefReportPlan,
  catalog: readonly MediaItem[],
): PlannerExportBadgeKind[] {
  const days =
    plan.mediaMix[0]?.days ??
    flightDays({
      budgetInputWon: plan.brief.budgetWon,
      budgetMode: "total",
      regionCodes: plan.brief.regionCodes as never,
      genders: plan.brief.genders ?? [],
      ageBands: (plan.brief.ageBands ?? []) as never,
      goal: null,
      industry: null,
      flightStart: plan.brief.flightStart || null,
      flightEnd: plan.brief.flightEnd || null,
      freeText: plan.brief.freeText ?? "",
    }) ??
    30;
  const lines = buildMixLines(catalog, briefMixQuantities(plan.mediaMix));
  const metrics = calcMixMetrics({
    lines,
    days,
    budgetWon: plan.brief.budgetWon,
    target: briefToTargetSpec({
      genders: plan.brief.genders ?? [],
      ageBands: (plan.brief.ageBands ?? []) as CampaignBriefInput["ageBands"],
    }),
  });
  const badges: PlannerExportBadgeKind[] = [
    metricBasisToExportBadge(metrics.totalImpressions.basis),
    metrics.netReach != null
      ? metricBasisToExportBadge(metrics.netReach.basis)
      : "pending",
    metrics.netReach != null
      ? metricBasisToExportBadge(metrics.reachRate!.basis)
      : "pending",
  ];
  if (metrics.mixCpmWon.value != null) {
    badges.push(metricBasisToExportBadge(metrics.mixCpmWon.basis));
  }
  return badges;
}

export function payloadKpiBadgeSequence(
  payload: PlannerReportExportPayload,
): PlannerExportBadgeKind[] {
  return payload.kpis.map((k) => k.badge);
}

export { EXPORT_KPI_ORDER };
