import {
  evaluateAggregateGate,
  getRecommendationLogCleanupBatchSize,
  getRecommendationLogTtlDays,
  resolveRecommendationLogCutoff,
} from "@/lib/recommend/pattern-stats-config";
import { readPatternStatsLastRun } from "@/lib/recommend/pattern-stats-ops-state";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type RecommendationLogCleanupResult = {
  ok: boolean;
  dryRun: boolean;
  ttlDays: number;
  cutoff: string;
  skipped?: boolean;
  skipReason?: string;
  wouldDelete?: number;
  deleted?: number;
  batches?: number;
};

export type RecommendationLogCleanupOptions = {
  dryRun: boolean;
  now?: Date;
  /** Test hook — skip OpsAutomationState aggregate gate. */
  skipAggregateGate?: boolean;
};

export async function runRecommendationLogCleanup(
  opts: RecommendationLogCleanupOptions,
): Promise<RecommendationLogCleanupResult> {
  const now = opts.now ?? new Date();
  const ttlDays = getRecommendationLogTtlDays();
  const cutoff = resolveRecommendationLogCutoff(now, ttlDays);
  const base = {
    ok: true,
    dryRun: opts.dryRun,
    ttlDays,
    cutoff: cutoff.toISOString(),
  };

  if (!isDatabaseConfigured()) {
    return {
      ...base,
      ok: false,
      wouldDelete: 0,
      deleted: 0,
      skipReason: "no_database",
      skipped: true,
    };
  }

  const db = getPrisma();
  const where = { createdAt: { lt: cutoff } };

  if (opts.dryRun) {
    const wouldDelete = await db.recommendationLog.count({ where });
    return {
      ...base,
      wouldDelete,
    };
  }

  if (!opts.skipAggregateGate) {
    const lastRun = await readPatternStatsLastRun();
    const gate = evaluateAggregateGate(lastRun, now);
    if (!gate.allowed) {
      const wouldDelete = await db.recommendationLog.count({ where });
      return {
        ...base,
        skipped: true,
        skipReason: gate.reason,
        wouldDelete,
        deleted: 0,
      };
    }
  }

  const batchSize = getRecommendationLogCleanupBatchSize();
  let deleted = 0;
  let batches = 0;

  while (true) {
    const batch = await db.recommendationLog.findMany({
      where,
      select: { id: true },
      take: batchSize,
      orderBy: { createdAt: "asc" },
    });

    if (batch.length === 0) break;

    const result = await db.recommendationLog.deleteMany({
      where: { id: { in: batch.map((row) => row.id) } },
    });

    deleted += result.count;
    batches += 1;

    if (batch.length < batchSize) break;
  }

  return {
    ...base,
    deleted,
    batches,
  };
}
