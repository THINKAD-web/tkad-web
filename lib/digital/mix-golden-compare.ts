import { MIX_ENGINE_MIN_CHANNELS } from "@/lib/digital/mix-types";

export type MixCompositionSnapshot = {
  channelCount: number;
  slugs: string[];
  budgetTotal: number;
};

export type MixGoldenCompareVerdict = "pass" | "warn" | "fail";

export type MixGoldenCompareResult = {
  verdict: MixGoldenCompareVerdict;
  slugJaccard: number;
  slugIntersectionCount: number;
  channelCountDelta: number;
  reasons: string[];
};

/** Jaccard similarity on slug sets. */
export function slugJaccard(a: readonly string[], b: readonly string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const slug of setA) {
    if (setB.has(slug)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 1 : intersection / union;
}

/**
 * PR5-c golden gate — distinguish "plausibly different" vs "clearly broken".
 *
 * FAIL:
 * - channelCount < MIN (3)
 * - channelCount <= 1 when baseline >= 4 (extreme collapse)
 * - channelCount < baseline - 2 (lost >2 channels vs dmpilot)
 * - slugJaccard < 0.34 when baseline has >= 4 channels (< half overlap)
 *
 * WARN:
 * - exact slug set mismatch but passes FAIL guards (adapter drift, acceptable)
 *
 * PASS:
 * - identical slug sets OR passes all FAIL guards with jaccard >= 0.5
 */
export function compareMixCompositionToBaseline(
  actual: MixCompositionSnapshot,
  baseline: MixCompositionSnapshot,
): MixGoldenCompareResult {
  const reasons: string[] = [];
  const slugJaccardScore = slugJaccard(actual.slugs, baseline.slugs);
  const intersection = actual.slugs.filter((s) => baseline.slugs.includes(s)).length;
  const channelCountDelta = actual.channelCount - baseline.channelCount;

  if (actual.channelCount < MIX_ENGINE_MIN_CHANNELS) {
    reasons.push(
      `channelCount ${actual.channelCount} < MIN ${MIX_ENGINE_MIN_CHANNELS}`,
    );
  }
  if (baseline.channelCount >= 4 && actual.channelCount <= 1) {
    reasons.push(
      `extreme collapse: ${baseline.channelCount} → ${actual.channelCount} channels`,
    );
  }
  if (actual.channelCount < baseline.channelCount - 2) {
    reasons.push(
      `lost >2 channels vs baseline (${baseline.channelCount} → ${actual.channelCount})`,
    );
  }
  if (baseline.channelCount >= 4 && slugJaccardScore < 0.34) {
    reasons.push(
      `slug overlap too low (Jaccard ${slugJaccardScore.toFixed(2)} < 0.34)`,
    );
  }

  if (reasons.length > 0) {
    return {
      verdict: "fail",
      slugJaccard: slugJaccardScore,
      slugIntersectionCount: intersection,
      channelCountDelta,
      reasons,
    };
  }

  const exact =
    actual.channelCount === baseline.channelCount &&
    actual.slugs.join(",") === baseline.slugs.join(",");

  if (exact || slugJaccardScore >= 0.5) {
    return {
      verdict: "pass",
      slugJaccard: slugJaccardScore,
      slugIntersectionCount: intersection,
      channelCountDelta,
      reasons: exact ? ["exact slug parity"] : ["slug Jaccard >= 0.5"],
    };
  }

  return {
    verdict: "warn",
    slugJaccard: slugJaccardScore,
    slugIntersectionCount: intersection,
    channelCountDelta,
    reasons: [
      `plausible drift: Jaccard ${slugJaccardScore.toFixed(2)}, count delta ${channelCountDelta}`,
    ],
  };
}

export function logMixGoldenCompare(
  scenarioId: string,
  result: MixGoldenCompareResult,
): void {
  const payload = { scenarioId, ...result };
  if (result.verdict === "fail") {
    console.error("[mix-golden-compare]", payload);
  } else if (result.verdict === "warn") {
    console.warn("[mix-golden-compare]", payload);
  } else {
    console.info("[mix-golden-compare]", payload);
  }
}
