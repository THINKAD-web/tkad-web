/**
 * Reach / Frequency / GRP — 행정동 그리드 기반 중복 제거.
 *
 * 노출 수의 단순 합은 도달이 아니다. 같은 통근자가 같은 전광판을 한 달에
 * 40번 본다. 그걸 40명으로 세면 제안서의 도달 숫자가 통째로 허구가 된다.
 */
import {
  DONG_CORRELATION_RHO,
  EFFECTIVE_REACH_MIN_CONTACTS,
  MAX_DAILY_CONTACT_PROBABILITY,
  NATIONAL_AGE_SPLIT,
  NATIONAL_GENDER_SPLIT,
} from "./constants";
import type {
  DongProfile,
  PlannedMedia,
  ReachResult,
  TargetSpec,
} from "./types";

/**
 * 행정동 인구 중 타깃에 해당하는 인원.
 * 성별·연령은 독립으로 가정하고 곱한다 (교차 분포 데이터가 없다).
 */
export function resolveTargetPopulation(
  dong: DongProfile,
  target: TargetSpec,
): number {
  const pop = Number.isFinite(dong.population) ? Math.max(0, dong.population) : 0;
  if (pop === 0) return 0;

  let share = 1;

  if (target.genders && target.genders.length > 0) {
    const split = dong.genderSplit ?? NATIONAL_GENDER_SPLIT;
    share *= target.genders.reduce((sum, g) => sum + (split[g] ?? 0), 0);
  }

  if (target.ageBands && target.ageBands.length > 0) {
    const split = dong.ageSplit ?? NATIONAL_AGE_SPLIT;
    share *= target.ageBands.reduce((sum, b) => sum + (split[b] ?? 0), 0);
  }

  return pop * Math.min(1, Math.max(0, share));
}

/** P(Poisson(lambda) >= k) */
function poissonAtLeast(lambda: number, k: number): number {
  if (!Number.isFinite(lambda) || lambda <= 0) return 0;
  if (k <= 0) return 1;
  // P(X < k) = sum_{i=0}^{k-1} e^-l l^i / i!
  let term = Math.exp(-lambda);
  let cdf = term;
  for (let i = 1; i < k; i += 1) {
    term = (term * lambda) / i;
    cdf += term;
  }
  return Math.min(1, Math.max(0, 1 - cdf));
}

type DongAccumulator = {
  /** 아직 도달되지 않았을 확률 */
  notReached: number;
  /** 이 행정동에 귀속된 총 노출 */
  impressions: number;
};

/**
 * 순 도달 · 빈도 · GRP.
 *
 * 매체를 행정동 단위로 겹쳐 쌓되, 같은 행정동 안의 매체들은 상당 부분
 * 같은 사람이 본다는 점을 상관계수 ρ 로 보정한다. ρ 를 0 으로 두면
 * 매체를 늘릴수록 도달이 선형으로 늘어나 실제보다 크게 부풀려진다.
 */
export function calcNetReach(params: {
  medias: readonly PlannedMedia[];
  dongs: readonly DongProfile[];
  target: TargetSpec;
  days: number;
  /** 동일 행정동 내 매체 상관계수 (기본 0.7) */
  rho?: number;
  /** 유효 도달 기준 접촉 횟수 (기본 3) */
  effectiveMinContacts?: number;
}): ReachResult {
  const rho = params.rho ?? DONG_CORRELATION_RHO;
  const minContacts =
    params.effectiveMinContacts ?? EFFECTIVE_REACH_MIN_CONTACTS;
  const days = Math.max(1, Math.floor(params.days));

  const dongById = new Map(params.dongs.map((d) => [d.code, d]));
  const grid = new Map<string, DongAccumulator>();

  for (const media of params.medias) {
    for (const coverage of media.coverageDongs) {
      const dong = dongById.get(coverage.code);
      if (!dong) continue;
      const population = Math.max(0, dong.population);
      if (population <= 0) continue;

      const weight = Math.min(1, Math.max(0, coverage.weight));
      if (weight <= 0) continue;

      const dailyP = Math.min(
        MAX_DAILY_CONTACT_PROBABILITY,
        Math.max(0, (media.dailyImpressions * weight) / population),
      );
      const periodP = 1 - Math.pow(1 - dailyP, days);

      const acc = grid.get(coverage.code) ?? { notReached: 1, impressions: 0 };
      // 상관 보정: 이미 많이 도달된 동일수록 이 매체의 증분 도달이 줄어든다.
      const incremental = periodP * (1 - rho * (1 - acc.notReached));
      acc.notReached *= 1 - Math.min(1, Math.max(0, incremental));
      acc.impressions += media.totalImpressions * weight;
      grid.set(coverage.code, acc);
    }
  }

  let netReach = 0;
  let effectiveReach = 0;
  let targetPopulation = 0;

  for (const dong of params.dongs) {
    const targetPop = resolveTargetPopulation(dong, params.target);
    targetPopulation += targetPop;
    if (targetPop <= 0) continue;

    const acc = grid.get(dong.code);
    if (!acc) continue;

    const reachedHere = targetPop * (1 - acc.notReached);
    netReach += reachedHere;
    if (reachedHere <= 0) continue;

    // 접촉 횟수 분포는 Poisson 으로 근사하되, 수준(level)은 위에서 구한
    // 상관 보정 도달에 앵커링한다 → effectiveReach <= netReach 가 보장된다.
    const totalPop = Math.max(1, dong.population);
    const lambda = (acc.impressions * (targetPop / totalPop)) / targetPop;
    const p1 = poissonAtLeast(lambda, 1);
    const pk = poissonAtLeast(lambda, minContacts);
    const ratio = p1 > 0 ? Math.min(1, pk / p1) : 0;
    effectiveReach += reachedHere * ratio;
  }

  const totalImpressions = params.medias.reduce(
    (sum, m) => sum + Math.max(0, m.totalImpressions),
    0,
  );

  // 정의상 넘을 수 없지만, 데이터 이상으로 넘는 값이 제안서에 나가는 것을 막는다.
  netReach = Math.min(netReach, targetPopulation);
  effectiveReach = Math.min(effectiveReach, netReach);

  const reachRate = targetPopulation > 0 ? netReach / targetPopulation : 0;
  const frequency = netReach > 0 ? totalImpressions / netReach : 0;

  return {
    netReach,
    targetPopulation,
    reachRate: Math.min(1, reachRate),
    frequency,
    grp: Math.min(1, reachRate) * 100 * frequency,
    effectiveReach,
    effectiveReachRate:
      targetPopulation > 0 ? effectiveReach / targetPopulation : 0,
    totalImpressions,
  };
}
