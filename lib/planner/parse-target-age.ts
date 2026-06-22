import type { PlannerAgeKey } from "@/lib/planner/types";

/** Parsed decade endpoints (10, 20, 30 …) — Korean "N대" convention. */
export type ParsedTargetAge =
  | { kind: "all"; source: "explicit" | "fallback" | "empty" }
  | { kind: "range"; minDecade: number; maxDecade: number; source: "range" | "single" };

const ALL_AGES_RE = /전\s*연령|전연령|all\s*ages?|올연령/i;
const RANGE_RE = /(\d{1,2})\s*[~\-–—]\s*(\d{1,2})\s*대/;
const SINGLE_DECADE_RE = /(\d{1,2})\s*대/;
const CENTER_RANGE_RE = /(\d{1,2})\s*[~\-–—]\s*(\d{1,2})\s*대\s*중심/i;

/** Planner age chip → representative decade(s) for overlap checks. */
export const PLANNER_AGE_DECADES: Record<Exclude<PlannerAgeKey, "ageAll">, number[]> = {
  age20s: [20],
  age30s: [30],
  age40s: [40],
  age50plus: [50, 60],
};

function normalizeDigits(s: string): string {
  return s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 48))
    .replace(/\s+/g, " ")
    .trim();
}

function clampDecade(n: number): number {
  if (n < 10) return 10;
  if (n > 90) return 90;
  return Math.round(n / 10) * 10;
}

/**
 * Parse free-text `Media.targetAge` into a decade range or "all".
 * Unrecognized text → `{ kind: 'all', source: 'fallback' }` (no penalty downstream).
 */
export function parseTargetAge(raw: string | null | undefined): ParsedTargetAge {
  const text = normalizeDigits(raw ?? "");
  if (!text) return { kind: "all", source: "empty" };

  if (ALL_AGES_RE.test(text)) {
    return { kind: "all", source: "explicit" };
  }

  const center = text.match(CENTER_RANGE_RE);
  if (center) {
    const minDecade = clampDecade(Number(center[1]));
    const maxDecade = clampDecade(Number(center[2]));
    if (maxDecade >= minDecade) {
      return { kind: "range", minDecade, maxDecade, source: "range" };
    }
  }

  const range = text.match(RANGE_RE);
  if (range) {
    const minDecade = clampDecade(Number(range[1]));
    const maxDecade = clampDecade(Number(range[2]));
    if (maxDecade >= minDecade) {
      return { kind: "range", minDecade, maxDecade, source: "range" };
    }
  }

  const single = text.match(SINGLE_DECADE_RE);
  if (single) {
    const d = clampDecade(Number(single[1]));
    return { kind: "range", minDecade: d, maxDecade: d, source: "single" };
  }

  if (/mz|2030|이십삼십|20\s*30/i.test(text)) {
    return { kind: "range", minDecade: 20, maxDecade: 30, source: "range" };
  }

  return { kind: "all", source: "fallback" };
}

function decadesOverlap(
  mediaMin: number,
  mediaMax: number,
  userDecades: number[],
): boolean {
  return userDecades.some((d) => d >= mediaMin && d <= mediaMax);
}

/** True when any selected planner age decade falls inside the media range. */
export function targetAgeMatchesPlannerAgeKeys(
  rawTargetAge: string | null | undefined,
  ageKeys: readonly PlannerAgeKey[],
): boolean {
  const keys = ageKeys.filter((k) => k !== "ageAll");
  if (keys.length === 0) return true;

  const userDecades = keys.flatMap(
    (k) => PLANNER_AGE_DECADES[k as Exclude<PlannerAgeKey, "ageAll">] ?? [],
  );
  if (userDecades.length === 0) return true;

  const parsed = parseTargetAge(rawTargetAge);
  if (parsed.kind === "all") return true;

  return decadesOverlap(parsed.minDecade, parsed.maxDecade, userDecades);
}

export type TargetAgeScoreResult = {
  points: number;
  matched: boolean;
  parsed: ParsedTargetAge;
};

/**
 * Score contribution for planner age matching (0–15).
 * - No ageKeys: caller should use legacy path (not invoked).
 * - Parse fallback / 전연령: neutral 10 (no penalty).
 * - Range overlap: 15.
 * - Range mismatch: 5 (rank lower, never exclude).
 */
export function countMediaMatchingPlannerAgeKeys(
  media: readonly { targetAge?: string | null }[],
  ageKeys: readonly PlannerAgeKey[],
): number {
  const keys = ageKeys.filter((k) => k !== "ageAll");
  if (keys.length === 0) return media.length;
  return media.filter((m) =>
    targetAgeMatchesPlannerAgeKeys(m.targetAge, keys),
  ).length;
}

export function scoreTargetAgeForPlanner(
  rawTargetAge: string | null | undefined,
  ageKeys: readonly PlannerAgeKey[],
): TargetAgeScoreResult {
  const keys = ageKeys.filter((k) => k !== "ageAll");
  const parsed = parseTargetAge(rawTargetAge);

  if (keys.length === 0) {
    return { points: 10, matched: true, parsed };
  }

  if (parsed.kind === "all") {
    return { points: 10, matched: true, parsed };
  }

  const matched = targetAgeMatchesPlannerAgeKeys(rawTargetAge, keys);
  return {
    points: matched ? 15 : 5,
    matched,
    parsed,
  };
}
