import type { MetricEngine, EngineInput, EngineOutput } from "./types";
import { MODEL_VERSIONS } from "./constants";

/**
 * v0 fallback — 실제 계산 없음. legacy/current 값 pass-through.
 * modelVersion: legacy-migration-v1 → v0-fallback 승격만 수행.
 */
export const v0FallbackEngine: MetricEngine = {
  version: MODEL_VERSIONS.V0_FALLBACK,

  canProcess(input: EngineInput): boolean {
    return (
      input.legacy.dailyImpressions !== null ||
      input.legacy.cpm !== null ||
      input.current != null ||
      (input.media.impressions != null && input.media.impressions > 0)
    );
  },

  compute(input: EngineInput): EngineOutput {
    const storedMonthly = input.media.impressions;
    const dailyImpressions =
      input.legacy.dailyImpressions ??
      input.current?.dailyImpressions ??
      (storedMonthly != null && storedMonthly > 0
        ? Math.round(storedMonthly / 30)
        : 0);
    const cpm =
      input.legacy.cpm ??
      input.current?.cpm ??
      (typeof input.media.cpm === "number" && input.media.cpm > 0
        ? Math.round(input.media.cpm)
        : 0);

    return {
      dailyImpressions,
      monthlyImpressions:
        storedMonthly != null && storedMonthly > 0
          ? storedMonthly
          : dailyImpressions * 30,
      hourlyImpressions: null,
      cpm,
      visibilityScore: null,
      reliabilityGrade: "C",
      sourceSignalIds: [],
      computedAt: new Date(),
    };
  },
};
