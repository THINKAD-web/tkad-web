import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { userInfo } from "node:os";
import { resolve } from "node:path";

/** Shared metric snapshot for batch execute before/after JSON reports. */
export const BATCH_MEDIA_METRIC_SELECT = {
  impressions: true,
  cpm: true,
  reviewStatus: true,
  computedMetric: { select: { modelVersion: true } },
} as const;

export type BatchMediaMetricSnapshot = {
  impressions: number | null;
  cpm: number | null;
  reviewStatus: string;
  modelVersion: string | null;
};

export function snapshotBatchMediaMetrics(row: {
  impressions: number | null;
  cpm: number | null;
  reviewStatus: string;
  computedMetric?: { modelVersion: string } | null;
}): BatchMediaMetricSnapshot {
  return {
    impressions: row.impressions,
    cpm: row.cpm,
    reviewStatus: row.reviewStatus,
    modelVersion: row.computedMetric?.modelVersion ?? null,
  };
}

export function batchReportMeta(scriptRelativePath: string) {
  let commitHash = "unknown";
  try {
    commitHash = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    /* not a git checkout */
  }
  return {
    executedAtUtc: new Date().toISOString(),
    executor: process.env.USER || userInfo().username || "unknown",
    script: scriptRelativePath,
    commitHash,
  };
}

export function writeBatchExecuteReport(
  root: string,
  outRelativePath: string,
  report: Record<string, unknown>,
) {
  mkdirSync(resolve(root, "reports"), { recursive: true });
  const outPath = resolve(root, outRelativePath);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  return outPath;
}
