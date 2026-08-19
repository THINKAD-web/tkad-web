/**
 * Phase 4a-4 — 브리프/믹스 → Reach 엔진 입력 어댑터.
 *
 * DongProfile 성·연령: 동별 세분 데이터 없음 → resolveTargetPopulation 이
 * NATIONAL_GENDER_SPLIT / NATIONAL_AGE_SPLIT 폴백 (basis: derived).
 */
import type { DongProfile, TargetSpec } from "@/lib/metrics/types";
import type { CampaignBriefInput } from "./types";
import type { MixLine } from "./mix-metrics";

export type CoverageDongWithPop = {
  code: string;
  weight: number;
  population: number;
};

/** 브리프 타깃 → Reach TargetSpec (Phase 3 스코어링과 동일 규칙) */
export function briefToTargetSpec(
  brief: Pick<CampaignBriefInput, "genders" | "ageBands">,
): TargetSpec {
  return {
    genders: brief.genders.length > 0 ? brief.genders : undefined,
    ageBands: brief.ageBands.length > 0 ? brief.ageBands : undefined,
  };
}

/** 믹스에 등장하는 행정동 프로파일 (MOIS 인구, 성·연령은 전국 폴백) */
export function buildDongProfilesFromLines(
  lines: readonly MixLine[],
): DongProfile[] {
  const byCode = new Map<string, number>();
  for (const line of lines) {
    for (const d of line.media.coverageDongs ?? []) {
      if (d.population > 0) byCode.set(d.code, d.population);
    }
  }
  return [...byCode.entries()].map(([code, population]) => ({
    code,
    population,
  }));
}

/** 매체변 coverageDongs (weight만 엔진에 전달) */
export function buildCoverageByMediaId(
  lines: readonly MixLine[],
): Readonly<Record<string, readonly { code: string; weight: number }[]>> {
  const out: Record<string, { code: string; weight: number }[]> = {};
  for (const line of lines) {
    const cov = line.media.coverageDongs;
    if (!cov?.length) continue;
    out[line.media.id] = cov.map((d) => ({ code: d.code, weight: d.weight }));
  }
  return out;
}

export function countLinesWithoutCoverage(lines: readonly MixLine[]): number {
  return lines.filter((l) => !(l.media.coverageDongs?.length ?? 0)).length;
}

export function mediaIdsWithoutCoverage(lines: readonly MixLine[]): string[] {
  return lines
    .filter((l) => !(l.media.coverageDongs?.length ?? 0))
    .map((l) => l.media.id);
}

/** coverageDongs JSON + MOIS index → MediaItem 필드 */
export function parseCoverageDongsWithPopulation(
  raw: unknown,
  popIndex: ReadonlyMap<string, number>,
): CoverageDongWithPop[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: CoverageDongWithPop[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const code = String((item as { code?: unknown }).code ?? "").trim();
    const weight = Number((item as { weight?: unknown }).weight ?? 0);
    const population = popIndex.get(code);
    if (!code || !Number.isFinite(weight) || weight <= 0) continue;
    if (population == null || population <= 0) continue;
    out.push({ code, weight, population });
  }
  return out.length > 0 ? out : undefined;
}
