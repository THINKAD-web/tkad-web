import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  RECOMMENDATION_PATTERN_STATS_STATE_KEY,
  type PatternStatsLastRunState,
} from "@/lib/recommend/pattern-stats-config";

export async function readPatternStatsLastRun(): Promise<PatternStatsLastRunState | null> {
  if (!isDatabaseConfigured()) return null;

  const row = await getPrisma().opsAutomationState.findUnique({
    where: { key: RECOMMENDATION_PATTERN_STATS_STATE_KEY },
    select: { jsonValue: true },
  });

  if (!row?.jsonValue || typeof row.jsonValue !== "object") return null;
  return row.jsonValue as PatternStatsLastRunState;
}

/** Called by weekly aggregate cron (STEP3b). */
export async function markPatternStatsAggregateSuccess(
  at: Date = new Date(),
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const payload: PatternStatsLastRunState = {
    at: at.toISOString(),
    ok: true,
  };

  await getPrisma().opsAutomationState.upsert({
    where: { key: RECOMMENDATION_PATTERN_STATS_STATE_KEY },
    create: {
      key: RECOMMENDATION_PATTERN_STATS_STATE_KEY,
      jsonValue: payload,
    },
    update: {
      jsonValue: payload,
    },
  });
}
