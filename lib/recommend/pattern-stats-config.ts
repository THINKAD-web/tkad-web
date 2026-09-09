import type { PatternComboDimensions } from "@/lib/recommend/pattern-stats-types";

/** OpsAutomationState key — weekly aggregate cron writes; cleanup reads. */
export const RECOMMENDATION_PATTERN_STATS_STATE_KEY =
  "recommendation_pattern_stats_last_run";

export const RECOMMENDATION_LOG_TTL_DAYS_DEFAULT = 180;
export const RECOMMENDATION_LOG_CLEANUP_BATCH_SIZE_DEFAULT = 1000;
export const PATTERN_STATS_TOP_MEDIA_COUNT = 5;
export const PATTERN_STATS_BURST_WINDOW_MS_DEFAULT = 3_600_000;
export const PATTERN_STATS_BURST_MAX_PER_WINDOW_DEFAULT = 1;
export const MIN_PATTERN_STATS_SAMPLE_THRESHOLD_DEFAULT = 15;

/** Cleanup runs only if aggregate succeeded within this window (8 days). */
export const PATTERN_STATS_AGGREGATE_MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;

const MS_DAY = 86_400_000;

/**
 * STEP1 skew: planner default-brief test traffic (~64% of logs at 2026-09).
 * 1667만원/월 → budget bucket `1000_2999`.
 */
export const DEFAULT_EXCLUDED_PATTERN_COMBOS: readonly PatternComboDimensions[] =
  [
    {
      source: "planner",
      industry: "other",
      target: "mass",
      budgetBucket: "1000_2999",
      goal: "awareness",
    },
  ];

export function getPatternStatsBurstWindowMs(): number {
  const raw = process.env.PATTERN_STATS_BURST_WINDOW_MS?.trim();
  if (!raw) return PATTERN_STATS_BURST_WINDOW_MS_DEFAULT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return PATTERN_STATS_BURST_WINDOW_MS_DEFAULT;
  return n;
}

export function getPatternStatsBurstMaxPerWindow(): number {
  const raw = process.env.PATTERN_STATS_BURST_MAX_PER_WINDOW?.trim();
  if (!raw) return PATTERN_STATS_BURST_MAX_PER_WINDOW_DEFAULT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return PATTERN_STATS_BURST_MAX_PER_WINDOW_DEFAULT;
  }
  return n;
}

export function getMinPatternStatsSampleThreshold(): number {
  const raw = process.env.MIN_PATTERN_STATS_SAMPLE_THRESHOLD?.trim();
  if (!raw) return MIN_PATTERN_STATS_SAMPLE_THRESHOLD_DEFAULT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return MIN_PATTERN_STATS_SAMPLE_THRESHOLD_DEFAULT;
  }
  return n;
}

export function parseExcludedPatternCombos(): PatternComboDimensions[] {
  const raw = process.env.PATTERN_STATS_EXCLUDED_COMBOS_JSON?.trim();
  const fromEnv: PatternComboDimensions[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item || typeof item !== "object") continue;
          const o = item as Record<string, unknown>;
          if (
            typeof o.source === "string" &&
            typeof o.industry === "string" &&
            typeof o.target === "string" &&
            typeof o.budgetBucket === "string" &&
            typeof o.goal === "string"
          ) {
            fromEnv.push({
              source: o.source as PatternComboDimensions["source"],
              industry: o.industry,
              target: o.target,
              budgetBucket: o.budgetBucket,
              goal: o.goal,
            });
          }
        }
      }
    } catch {
      /* ignore malformed env */
    }
  }
  return [...DEFAULT_EXCLUDED_PATTERN_COMBOS, ...fromEnv];
}

/** Monthly budget (won) → coarse marketing bucket. */
export function bucketMonthlyBudgetWon(monthlyBudgetWon: number): string {
  if (!Number.isFinite(monthlyBudgetWon) || monthlyBudgetWon <= 0) {
    return "unknown";
  }
  if (monthlyBudgetWon < 5_000_000) return "u500";
  if (monthlyBudgetWon < 10_000_000) return "500_999";
  if (monthlyBudgetWon < 30_000_000) return "1000_2999";
  if (monthlyBudgetWon < 50_000_000) return "3000_4999";
  if (monthlyBudgetWon < 100_000_000) return "5000_9999";
  return "10000_plus";
}

export function buildPatternComboKey(combo: PatternComboDimensions): string {
  return [
    combo.source,
    combo.industry,
    combo.target,
    combo.budgetBucket,
    combo.goal,
  ].join("|");
}

export function isExcludedPatternCombo(
  combo: PatternComboDimensions,
  excluded: readonly PatternComboDimensions[] = parseExcludedPatternCombos(),
): boolean {
  const key = buildPatternComboKey(combo);
  return excluded.some((row) => buildPatternComboKey(row) === key);
}

export function getRecommendationLogTtlDays(): number {
  const raw = process.env.RECOMMENDATION_LOG_TTL_DAYS?.trim();
  if (!raw) return RECOMMENDATION_LOG_TTL_DAYS_DEFAULT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return RECOMMENDATION_LOG_TTL_DAYS_DEFAULT;
  return n;
}

export function getRecommendationLogCleanupBatchSize(): number {
  const raw = process.env.RECOMMENDATION_LOG_CLEANUP_BATCH_SIZE?.trim();
  if (!raw) return RECOMMENDATION_LOG_CLEANUP_BATCH_SIZE_DEFAULT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return RECOMMENDATION_LOG_CLEANUP_BATCH_SIZE_DEFAULT;
  }
  return n;
}

/**
 * Default true — first deploy must report wouldDelete before live deletes.
 * Query `?dryRun=1|0` overrides env for manual cron runs.
 */
export function resolveCleanupDryRun(queryParam: string | null | undefined): boolean {
  const q = queryParam?.trim().toLowerCase();
  if (q === "1" || q === "true" || q === "yes") return true;
  if (q === "0" || q === "false" || q === "no") return false;

  const env = process.env.RECOMMENDATION_LOG_CLEANUP_DRY_RUN?.trim().toLowerCase();
  if (env === "0" || env === "false" || env === "no") return false;
  return true;
}

export function resolveRecommendationLogCutoff(
  now: Date,
  ttlDays: number,
): Date {
  return new Date(now.getTime() - ttlDays * MS_DAY);
}

export type PatternStatsLastRunState = {
  at?: string;
  ok?: boolean;
};

export function evaluateAggregateGate(
  state: PatternStatsLastRunState | null | undefined,
  now: Date,
  maxAgeMs: number = PATTERN_STATS_AGGREGATE_MAX_AGE_MS,
): { allowed: boolean; reason?: string } {
  if (!state?.ok || !state.at) {
    return { allowed: false, reason: "aggregate_never_succeeded" };
  }

  const at = new Date(state.at);
  if (Number.isNaN(at.getTime())) {
    return { allowed: false, reason: "aggregate_invalid_timestamp" };
  }

  if (now.getTime() - at.getTime() > maxAgeMs) {
    return { allowed: false, reason: "aggregate_stale" };
  }

  return { allowed: true };
}
