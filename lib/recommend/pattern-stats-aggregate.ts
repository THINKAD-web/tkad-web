import { createHash } from "node:crypto";
import {
  PATTERN_STATS_TOP_MEDIA_COUNT,
  bucketMonthlyBudgetWon,
  buildPatternComboKey,
  getPatternStatsBurstMaxPerWindow,
  getPatternStatsBurstWindowMs,
  getRecommendationLogTtlDays,
  isExcludedPatternCombo,
  parseExcludedPatternCombos,
  resolveRecommendationLogCutoff,
} from "@/lib/recommend/pattern-stats-config";
import { markPatternStatsAggregateSuccess } from "@/lib/recommend/pattern-stats-ops-state";
import type {
  PatternComboDimensions,
  PatternStatsAggregateRow,
  PatternStatsSource,
  RecommendationLogInputJson,
  RecommendationLogItemJson,
} from "@/lib/recommend/pattern-stats-types";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type RecommendationLogAggregateRecord = {
  source: string;
  input: unknown;
  recommendations: unknown;
  createdAt: Date;
};

export type PatternStatsAggregateResult = {
  ok: boolean;
  windowStart: string;
  processedLogs: number;
  countedLogs: number;
  excludedComboLogs: number;
  burstFilteredLogs: number;
  combosWritten: number;
  combosRemoved: number;
  durationMs: number;
  skipReason?: string;
};

type ComboAccumulator = {
  combo: PatternComboDimensions;
  count: number;
  mediaCounts: Map<string, number>;
};

function normalizeSource(raw: string): PatternStatsSource | null {
  if (raw === "recommend" || raw === "planner") return raw;
  return null;
}

import { dimensionsFromLog } from "@/lib/recommend/pattern-stats-dimensions";

export { dimensionsFromLog } from "@/lib/recommend/pattern-stats-dimensions";

export function parseRecommendationLogInput(
  raw: unknown,
): RecommendationLogInputJson | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as RecommendationLogInputJson;
}

export function normalizeInputForFingerprint(
  input: RecommendationLogInputJson,
): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...input };
  delete clone._meta;
  delete clone.seed;

  for (const key of ["regions", "targets", "goalTags", "categories"] as const) {
    const value = clone[key];
    if (Array.isArray(value)) {
      clone[key] = [...value].map(String).sort();
    }
  }

  return clone;
}

export function fingerprintRecommendationInput(input: RecommendationLogInputJson): string {
  const normalized = normalizeInputForFingerprint(input);
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function shouldCountWithBurstDedupe(args: {
  fingerprint: string;
  createdAtMs: number;
  lastCountedAtByFingerprint: Map<string, number[]>;
  windowMs: number;
  maxPerWindow: number;
}): boolean {
  const prior = args.lastCountedAtByFingerprint.get(args.fingerprint) ?? [];
  const windowStart = args.createdAtMs - args.windowMs;
  const active = prior.filter((ts) => ts >= windowStart);

  if (active.length >= args.maxPerWindow) {
    args.lastCountedAtByFingerprint.set(args.fingerprint, active);
    return false;
  }

  active.push(args.createdAtMs);
  args.lastCountedAtByFingerprint.set(args.fingerprint, active);
  return true;
}

function parseRecommendations(raw: unknown): RecommendationLogItemJson[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is RecommendationLogItemJson =>
      !!item && typeof item === "object" && !Array.isArray(item),
  );
}

function topMediaIds(mediaCounts: Map<string, number>): string[] {
  return [...mediaCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, PATTERN_STATS_TOP_MEDIA_COUNT)
    .map(([mediaId]) => mediaId);
}

export function aggregateRecommendationLogs(
  logs: readonly RecommendationLogAggregateRecord[],
  opts?: {
    excludedCombos?: readonly PatternComboDimensions[];
    burstWindowMs?: number;
    burstMaxPerWindow?: number;
  },
): {
  rows: PatternStatsAggregateRow[];
  processedLogs: number;
  countedLogs: number;
  excludedComboLogs: number;
  burstFilteredLogs: number;
} {
  const excluded = opts?.excludedCombos ?? parseExcludedPatternCombos();
  const burstWindowMs = opts?.burstWindowMs ?? getPatternStatsBurstWindowMs();
  const burstMaxPerWindow =
    opts?.burstMaxPerWindow ?? getPatternStatsBurstMaxPerWindow();

  const sorted = [...logs].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const accumulators = new Map<string, ComboAccumulator>();
  const lastCountedAtByFingerprint = new Map<string, number[]>();

  let countedLogs = 0;
  let excludedComboLogs = 0;
  let burstFilteredLogs = 0;

  for (const log of sorted) {
    const source = normalizeSource(log.source);
    const input = parseRecommendationLogInput(log.input);
    if (!source || !input) continue;

    const combo = dimensionsFromLog(source, input);
    if (isExcludedPatternCombo(combo, excluded)) {
      excludedComboLogs += 1;
      continue;
    }

    const fingerprint = fingerprintRecommendationInput(input);
    const allowed = shouldCountWithBurstDedupe({
      fingerprint,
      createdAtMs: log.createdAt.getTime(),
      lastCountedAtByFingerprint,
      windowMs: burstWindowMs,
      maxPerWindow: burstMaxPerWindow,
    });
    if (!allowed) {
      burstFilteredLogs += 1;
      continue;
    }

    countedLogs += 1;
    const comboKey = buildPatternComboKey(combo);
    let acc = accumulators.get(comboKey);
    if (!acc) {
      acc = { combo, count: 0, mediaCounts: new Map() };
      accumulators.set(comboKey, acc);
    }
    acc.count += 1;

    for (const item of parseRecommendations(log.recommendations)) {
      const mediaId = item.mediaId?.trim();
      if (!mediaId) continue;
      acc.mediaCounts.set(mediaId, (acc.mediaCounts.get(mediaId) ?? 0) + 1);
    }
  }

  const rows: PatternStatsAggregateRow[] = [...accumulators.values()].map(
    (acc) => ({
      ...acc.combo,
      comboKey: buildPatternComboKey(acc.combo),
      count: acc.count,
      topMediaIds: topMediaIds(acc.mediaCounts),
    }),
  );

  return {
    rows,
    processedLogs: sorted.length,
    countedLogs,
    excludedComboLogs,
    burstFilteredLogs,
  };
}

export async function runRecommendationPatternStatsAggregate(opts?: {
  now?: Date;
}): Promise<PatternStatsAggregateResult> {
  const started = Date.now();
  const now = opts?.now ?? new Date();
  const ttlDays = getRecommendationLogTtlDays();
  const windowStart = resolveRecommendationLogCutoff(now, ttlDays);

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      windowStart: windowStart.toISOString(),
      processedLogs: 0,
      countedLogs: 0,
      excludedComboLogs: 0,
      burstFilteredLogs: 0,
      combosWritten: 0,
      combosRemoved: 0,
      durationMs: Date.now() - started,
      skipReason: "no_database",
    };
  }

  const db = getPrisma();
  const logs = await db.recommendationLog.findMany({
    where: { createdAt: { gte: windowStart } },
    select: {
      source: true,
      input: true,
      recommendations: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const aggregated = aggregateRecommendationLogs(logs);

  let combosRemoved = 0;

  await db.$transaction(
    async (tx) => {
      const removed = await tx.recommendationPatternStats.deleteMany({});
      combosRemoved = removed.count;

      if (aggregated.rows.length === 0) return;

      await tx.recommendationPatternStats.createMany({
        data: aggregated.rows.map((row) => ({
          comboKey: row.comboKey,
          industry: row.industry,
          target: row.target,
          budgetBucket: row.budgetBucket,
          goal: row.goal,
          source: row.source,
          count: row.count,
          topMediaIds: row.topMediaIds,
        })),
      });
    },
    { timeout: 30_000 },
  );

  await markPatternStatsAggregateSuccess(now);

  return {
    ok: true,
    windowStart: windowStart.toISOString(),
    processedLogs: aggregated.processedLogs,
    countedLogs: aggregated.countedLogs,
    excludedComboLogs: aggregated.excludedComboLogs,
    burstFilteredLogs: aggregated.burstFilteredLogs,
    combosWritten: aggregated.rows.length,
    combosRemoved,
    durationMs: Date.now() - started,
  };
}
