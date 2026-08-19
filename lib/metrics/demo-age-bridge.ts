/**
 * `Media.targetAge` 자유 텍스트 → demo age split ({ 10s…50s+ }).
 * PR-3 Phase 3 연령 브릿지 2순위 — basis `parsed`.
 */
import type { AgeBand } from "@/lib/metrics/types";
import { AGE_BANDS } from "@/lib/metrics/types";
import { parseTargetAge } from "@/lib/planner/parse-target-age";

const BAND_AGE_SPAN: Record<AgeBand, readonly [number, number]> = {
  "10s": [10, 19],
  "20s": [20, 29],
  "30s": [30, 39],
  "40s": [40, 49],
  "50s+": [50, 120],
};

function overlapYears(
  rangeMin: number,
  rangeMax: number,
  bandMin: number,
  bandMax: number,
): number {
  const lo = Math.max(rangeMin, bandMin);
  const hi = Math.min(rangeMax, bandMax);
  return hi >= lo ? hi - lo + 1 : 0;
}

/**
 * 파싱 가능한 targetAge → 연령 밴드 비율. 합 = 1.
 * 전연령·미인식·빈 값 → null (3순위 default 로 fallthrough).
 */
export function targetAgeToAgeSplit(
  raw: string | null | undefined,
): Partial<Record<AgeBand, number>> | null {
  const parsed = parseTargetAge(raw);
  if (parsed.kind !== "range") return null;

  const rangeMin = parsed.minDecade;
  const rangeMax = parsed.maxDecade >= 50 ? 120 : parsed.maxDecade + 9;

  const weights: Partial<Record<AgeBand, number>> = {};
  let total = 0;
  for (const band of AGE_BANDS) {
    const [bMin, bMax] = BAND_AGE_SPAN[band];
    const w = overlapYears(rangeMin, rangeMax, bMin, bMax);
    if (w > 0) {
      weights[band] = w;
      total += w;
    }
  }
  if (total <= 0) return null;

  const out: Partial<Record<AgeBand, number>> = {};
  for (const band of AGE_BANDS) {
    const w = weights[band];
    if (w != null && w > 0) {
      out[band] = w / total;
    }
  }
  return out;
}
