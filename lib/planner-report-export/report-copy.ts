/**
 * C-full-1 — 인사말·Executive summary 초안·지문(stale) SSOT.
 * 숫자가 들어간 노출·KPI 문구는 여기서 생성하지 않는다 (잠금 계층).
 */

import {
  buildReportStrategyLines,
  buildReportWhyLine,
  type ReportStrategyInput,
} from "@/lib/planner/report-strategy";

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
): string {
  const name = clientName?.trim();
  if (isKo) {
    if (name) {
      return `${name}님, 안녕하세요.\n\n아래와 같이 OOH 미디어 캠페인 제안을 드립니다.`;
    }
    return "안녕하세요.\n\n아래와 같이 OOH 미디어 캠페인 제안을 드립니다.";
  }
  if (name) {
    return `Dear ${name},\n\nPlease find our OOH media campaign proposal below.`;
  }
  return "Please find our OOH media campaign proposal below.";
}

export type DefaultExecutiveSummaryInput = ReportStrategyInput & {
  topMediaName: string;
};

/** 편집 가능 Executive summary 초안 — 노출·CPM 수치 없음 */
export function buildDefaultExecutiveSummaryLines(
  input: DefaultExecutiveSummaryInput,
): string[] {
  const extra = buildReportStrategyLines(input);
  return [
    buildReportWhyLine(input),
    ...extra,
    input.isKo
      ? `다음 액션 · ${input.topMediaName} 우선 확정 후, 동일 동선의 디지털 리타게팅을 연계하면 전환 기여를 추가로 끌어올릴 수 있습니다.`
      : `Next · Lock ${input.topMediaName} first, then layer digital retargeting on the same routes to lift conversion contribution.`,
  ].filter((line) => line.trim().length > 0);
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
