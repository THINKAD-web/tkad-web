/**
 * C-full-1 — 인사말·Executive summary 초안·지문(stale) SSOT.
 * 숫자가 들어간 노출·KPI 문구는 여기서 생성하지 않는다 (잠금 계층).
 */

import {
  buildReportStrategyLines,
  buildReportWhyLine,
  type ReportStrategyInput,
} from "@/lib/planner/report-strategy";
import {
  getPlannerDocumentTypeConfig,
  type PlannerDocumentTypeKey,
} from "@/lib/planner-report-export/document-type";

export type ReportCopyFingerprintInput = {
  mediaIds: readonly string[];
  quantities?: Record<string, number>;
  priceOptionIndex?: Record<string, number>;
};

export function computeReportCopyFingerprint(
  input: ReportCopyFingerprintInput,
): string {
  const ids = [...input.mediaIds].sort();
  const qty = input.quantities ?? {};
  const idx = input.priceOptionIndex ?? {};
  const rows = ids.map((id) => [
    id,
    qty[id] ?? 1,
    idx[id] ?? 0,
  ]);
  return JSON.stringify(rows);
}

export function isReportCopyStale(params: {
  copyFingerprint: string | null;
  greetingTouched: boolean;
  executiveSummaryTouched: boolean;
  currentFingerprint: string;
}): boolean {
  const touched =
    params.greetingTouched || params.executiveSummaryTouched;
  if (!touched) return false;
  if (!params.copyFingerprint) return false;
  return params.copyFingerprint !== params.currentFingerprint;
}

export function buildDefaultReportGreeting(
  isKo: boolean,
  clientName?: string,
  documentType?: PlannerDocumentTypeKey,
): string {
  const config = getPlannerDocumentTypeConfig(documentType ?? "proposal");
  return isKo
    ? config.greetingToneKo(clientName)
    : config.greetingToneEn(clientName);
}

export type DefaultExecutiveSummaryInput = ReportStrategyInput & {
  topMediaName: string;
  topMediaBudgetPct?: number;
};

/** 편집 가능 Executive summary 초안 — 노출·CPM 수치 없음 */
export function buildDefaultExecutiveSummaryLines(
  input: DefaultExecutiveSummaryInput,
): string[] {
  const extra = buildReportStrategyLines(input);
  const topName = input.topMediaName;
  const budgetPctStr = input.topMediaBudgetPct != null
    ? ` (${Math.round(input.topMediaBudgetPct)}%)`
    : "";
  return [
    buildReportWhyLine(input),
    ...extra,
    input.isKo
      ? `다음 액션 · 예산 비중 1위 ${topName}${budgetPctStr} 우선 확정 후, 동일 동선의 디지털 리타게팅을 연계하면 전환 기여를 추가로 끌어올릴 수 있습니다.`
      : `Next · Lock ${topName}${budgetPctStr} first, then layer digital retargeting on the same routes to lift conversion contribution.`,
  ].filter((line) => line.trim().length > 0);
}

export function findTopBudgetMediaName(
  items: readonly { name: string; budgetPct: number }[],
  fallbackKo: string,
  fallbackEn: string,
  isKo: boolean,
): { name: string; budgetPct: number } {
  if (items.length === 0) {
    return { name: isKo ? fallbackKo : fallbackEn, budgetPct: 0 };
  }
  const sorted = [...items].sort((a, b) => b.budgetPct - a.budgetPct);
  return { name: sorted[0]!.name, budgetPct: sorted[0]!.budgetPct };
}

export function splitReportCopyParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function joinReportCopyLines(lines: readonly string[]): string {
  return lines.join("\n\n");
}
