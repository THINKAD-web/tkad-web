import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { DimensionSource } from "./backfill-mapping";

export type BatchResult = {
  name: string;
  target: number;
  success: number;
  failed: number;
  skipped: number;
  failures: { mediaId: string; error: string }[];
};

export type BackfillStats = {
  env: string;
  mode: string;
  hostPrefix: string;
  scriptSha: string;
  startedAt: string;
  endedAt: string;
  totalMediaRows: number;
  factSheetPlanned: number;
  factSheetSkippedNoCoords: number;
  computedPlanned: number;
  batches: BatchResult[];
  dimensionSource: Record<DimensionSource | "null", number>;
  reliabilityGrade: Record<string, number>;
  skippedRules: string[];
  nullSummary: {
    latitude: number;
    longitude: number;
    mediaSubtype: number;
  };
};

export function emptyStats(
  env: string,
  mode: string,
  hostPrefix: string,
  scriptSha: string,
): BackfillStats {
  return {
    env,
    mode,
    hostPrefix,
    scriptSha,
    startedAt: new Date().toISOString(),
    endedAt: "",
    totalMediaRows: 0,
    factSheetPlanned: 0,
    factSheetSkippedNoCoords: 0,
    computedPlanned: 0,
    batches: [],
    dimensionSource: {
      MEASURED: 0,
      PARSED_FROM_TEXT: 0,
      ESTIMATED_MEDIAN: 0,
      UNKNOWN: 0,
      null: 0,
    },
    reliabilityGrade: { C: 0 },
    skippedRules: [],
    nullSummary: { latitude: 0, longitude: 0, mediaSubtype: 0 },
  };
}

export function renderReport(stats: BackfillStats): string {
  const lines: string[] = [
    "# 백필 리포트",
    "",
    `- 환경: ${stats.env}`,
    `- 모드: ${stats.mode}`,
    `- 시작: ${stats.startedAt}`,
    `- 종료: ${stats.endedAt}`,
    `- DB 호스트: ${stats.hostPrefix}`,
    `- 스크립트 SHA: ${stats.scriptSha}`,
    `- 대상 media row 수: ${stats.totalMediaRows}`,
    `- FactSheet 예정: ${stats.factSheetPlanned} (좌표 NULL 스kip: ${stats.factSheetSkippedNoCoords})`,
    `- ComputedMetric 예정: ${stats.computedPlanned}`,
    "",
    "## 배치별 결과",
    "",
  ];

  for (const b of stats.batches) {
    lines.push(
      `### ${b.name}`,
      `- 대상: ${b.target}`,
      `- 성공: ${b.success}`,
      `- 실패: ${b.failed}`,
      `- 스킵: ${b.skipped}`,
      "",
    );
    if (b.failures.length > 0) {
      lines.push("| mediaId | 오류 |", "|---|---|");
      for (const f of b.failures.slice(0, 50)) {
        lines.push(`| ${f.mediaId} | ${f.error.replace(/\|/g, "\\|")} |`);
      }
      if (b.failures.length > 50) {
        lines.push(`| … | (+${b.failures.length - 50} more) |`);
      }
      lines.push("");
    }
  }

  lines.push(
    "## dimensionSource 분포",
    "",
    `- MEASURED: ${stats.dimensionSource.MEASURED}`,
    `- PARSED_FROM_TEXT: ${stats.dimensionSource.PARSED_FROM_TEXT}`,
    `- ESTIMATED_MEDIAN: ${stats.dimensionSource.ESTIMATED_MEDIAN}`,
    `- UNKNOWN: ${stats.dimensionSource.UNKNOWN}`,
    `- null: ${stats.dimensionSource.null}`,
    "",
    "## reliabilityGrade 분포",
    "",
    `- A: ${stats.reliabilityGrade.A ?? 0}`,
    `- B: ${stats.reliabilityGrade.B ?? 0}`,
    `- C: ${stats.reliabilityGrade.C ?? 0}`,
    "",
    "## NULL 요약 (필수 Fact)",
    "",
    `- latitude NULL: ${stats.nullSummary.latitude}`,
    `- longitude NULL: ${stats.nullSummary.longitude}`,
    "",
    "## Skip된 rule / 메모",
    "",
    ...(stats.skippedRules.length
      ? stats.skippedRules.map((r) => `- ${r}`)
      : ["- (없음)"]),
    "",
  );

  return lines.join("\n");
}

export function writeReport(path: string, stats: BackfillStats): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, renderReport(stats), "utf8");
}
