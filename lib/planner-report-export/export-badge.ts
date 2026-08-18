/**
 * PR-8-2 — export KPI 배지 (화면 DataQualityBadge / AllocationSourceBadge 와 1:1).
 */

import { basisToBadge } from "@/components/planner/brief/data-quality-badge";
import type { DigitalAllocationSource } from "@/components/planner/brief/allocation-source-badge";
import type { MetricBasis } from "@/lib/metrics/defaults";

export type PlannerExportBadgeKind =
  | "measured"
  | "estimated"
  | "benchmark"
  | "pending";

/** 화면 MetricsPanel ↔ export KPI 키 */
export type ExportKpiBadgeKey = "impressions" | "reach" | "roi" | "cpm";

/** DataQualityBadge LABELS 와 동일 */
const DATA_QUALITY_LABELS: Record<
  "measured" | "estimated" | "pending",
  { ko: string; en: string }
> = {
  measured: { ko: "실측", en: "Measured" },
  estimated: { ko: "추정", en: "Estimated" },
  pending: { ko: "산정 중", en: "Pending" },
};

/** AllocationSourceBadge — benchmark 전용 (live → measured) */
const BENCHMARK_LABELS = { ko: "벤치마크 기반", en: "Benchmark-based" };

/** DataQualityBadge TONE — PDF/PPTX hex 변환 */
export const EXPORT_BADGE_PDF: Record<
  PlannerExportBadgeKind,
  { fill: string; text: string; border: string }
> = {
  measured: { fill: "#ECFDF5", text: "#047857", border: "#34D399" },
  estimated: { fill: "#FFFBEB", text: "#B45309", border: "#FBBF24" },
  pending: { fill: "#F4F4F5", text: "#52525B", border: "#A1A1AA" },
  benchmark: { fill: "#F0F9FF", text: "#075985", border: "#38BDF8" },
};

/** HTML preview — DataQualityBadge / AllocationSourceBadge class 톤 */
export const EXPORT_BADGE_HTML_CLASS: Record<PlannerExportBadgeKind, string> = {
  measured:
    "border-emerald-400/50 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
  estimated:
    "border-amber-400/50 bg-amber-400/10 text-amber-700 dark:text-amber-400",
  pending:
    "border-zinc-400/50 bg-zinc-400/10 text-zinc-600 dark:text-zinc-400",
  benchmark:
    "border-sky-400/50 bg-sky-400/10 text-sky-800 dark:text-sky-300",
};

/** CampaignPlan dataQuality → export badge (화면 basisToBadge 와 동일) */
export function metricBasisToExportBadge(
  basis: MetricBasis | null | undefined,
): PlannerExportBadgeKind {
  return basisToBadge(basis);
}

/** O-1 digital panel AllocationSourceBadge → export badge */
export function allocationSourceToExportBadge(
  source: DigitalAllocationSource,
): PlannerExportBadgeKind {
  return source === "live" ? "measured" : "benchmark";
}

export function exportBadgeLabel(
  badge: PlannerExportBadgeKind,
  isKo: boolean,
): string {
  if (badge === "benchmark") {
    return isKo ? BENCHMARK_LABELS.ko : BENCHMARK_LABELS.en;
  }
  return DATA_QUALITY_LABELS[badge][isKo ? "ko" : "en"];
}

/** PDF/PPTX/HTML 공용 — 화면과 동일한 대괄호 표기 */
export function exportBadgeBracketLabel(
  badge: PlannerExportBadgeKind,
  isKo: boolean,
): string {
  const label = exportBadgeLabel(badge, isKo);
  return isKo ? `[${label}]` : label;
}

export function assertAllKpisHaveBadge(
  kpis: readonly { badge?: PlannerExportBadgeKind }[],
): void {
  for (const k of kpis) {
    if (k.badge == null) {
      throw new Error("KPI missing badge field");
    }
  }
}
