/**
 * PR-6b 믹스 지표 — 브리프 + 선택 매체 → 지표 패널 값.
 *
 * 엔진(`lib/metrics/*`)은 건드리지 않는다. 이 파일은 어댑터다:
 * MediaItem 을 엔진 입력으로 변환하고, 기본값을 쓴 경우 그 근거(basis)를
 * 값과 함께 올려보낸다.
 *
 * ## 계산 가능 7개 (Phase 4a-4)
 *
 *   예산 소진 · 총 노출 · 혼합 CPM · 순 도달 · 도달률 · 평균 빈도 · GRP
 *
 * coverage 가 없는 매체는 도달 계산에서 **제외**하고 나머지로 산출한다.
 * 제외 건수는 `reachMeta.excludedCount` 로 UI 에 노출한다.
 */

import type { MediaItem } from "@/lib/media-data";
import { calcImpressions } from "@/lib/metrics/impressions";
import { calcNetReach } from "@/lib/metrics/reach";
import { resolveMediaProductPrice } from "@/lib/metrics/media-price-adapter";
import { classifyMedia } from "@/lib/metrics/classify";
import { CPM_BOUNDS, MIN_IMPRESSIONS_FOR_CPM } from "@/lib/metrics/constants";
import {
  resolveContactRateWithBasis,
  resolveSovShareWithBasis,
  weakestBasis,
  type MetricBasis,
  type MetricValue,
} from "@/lib/metrics/defaults";
import type { DongProfile, ReachResult, TargetSpec } from "@/lib/metrics/types";
import {
  buildCoverageByMediaId,
  buildDongProfilesFromLines,
  mediaIdsWithoutCoverage,
} from "./reach-adapter.ts";

/** 믹스 한 줄 — 매체 + 구매 수량 */
export type MixLine = {
  media: MediaItem;
  units: number;
};

export type MixLineMetrics = {
  mediaId: string;
  units: number;
  /** 이 줄의 집행 금액 */
  costWon: MetricValue<number> | null;
  /** 이 줄의 총 노출 */
  impressions: MetricValue<number>;
  contactRate: MetricValue<number>;
  sovShare: MetricValue<number>;
};

export type MixMetrics = {
  lines: MixLineMetrics[];

  // ── 계산 가능 ──
  totalCostWon: MetricValue<number>;
  totalImpressions: MetricValue<number>;
  /** 혼합 CPM (원). 노출이 너무 적거나 범위 밖이면 null */
  mixCpmWon: MetricValue<number | null>;

  // ── Reach (coverage 있는 매체만; basis=derived — contactRate·SOV 추정 포함) ──
  netReach: MetricValue<number> | null;
  reachRate: MetricValue<number> | null;
  frequency: MetricValue<number> | null;
  grp: MetricValue<number> | null;
  /** coverage NULL 매체 제외 메타 */
  reachMeta: ReachCalcMeta | null;

  // ── 예산 ──
  budgetWon: number;
  /** 예산 소진율 (0~1+, 초과 시 1 초과) */
  budgetUsedRate: number;
  /** 예산 초과분 (초과 없으면 0) */
  overBudgetWon: number;
  isOverBudget: boolean;
};

/** Reach 지표 basis — MOIS 인구는 실측이나 contactRate·SOV·성연령 전국 폴백으로 전체 추정 */
export const REACH_METRIC_BASIS: MetricBasis = "derived";

export type ReachCalcMeta = {
  includedCount: number;
  excludedCount: number;
  excludedMediaIds: string[];
};

export type TryCalcReachSuccess = {
  result: ReachResult;
  meta: ReachCalcMeta;
};

function priceBasisToMetricBasis(
  basis: "exact" | "interpolated" | "extrapolated",
): MetricBasis {
  // 등록 상품가와 정확히 일치 = 실측. 보간·외삽은 계산으로 유도한 값.
  return basis === "exact" ? "measured" : "derived";
}

/** 한 매체 줄의 지표 (노출·금액) */
export function calcLineMetrics(line: MixLine, days: number): MixLineMetrics {
  const { media, units } = line;

  const contactRate = resolveContactRateWithBasis({
    type: media.type,
    subCategory: media.subCategory,
    mainCategory: media.mediaCategory?.[0],
    name: media.name,
  });

  const sovShare = resolveSovShareWithBasis({
    type: media.type,
    subCategory: media.subCategory,
    mainCategory: media.mediaCategory?.[0],
    name: media.name,
  });

  const { totalImpressions } = calcImpressions({
    dailyTraffic: media.dailyFootTraffic ?? 0,
    contactRate: contactRate.value,
    sovShare: sovShare.value,
    units,
    days,
  });

  const price = resolveMediaProductPrice(media, days);
  const costWon: MetricValue<number> | null =
    price == null
      ? null
      : {
          value: price.amount * Math.max(0, units),
          basis: priceBasisToMetricBasis(price.basis),
        };

  return {
    mediaId: media.id,
    units,
    costWon,
    impressions: {
      value: totalImpressions,
      // 노출은 contactRate·sovShare 중 약한 쪽 근거를 따른다
      basis: weakestBasis([contactRate.basis, sovShare.basis]),
    },
    contactRate,
    sovShare,
  };
}

/**
 * 믹스 전체 지표.
 *
 * @param days   집행 일수 (브리프 flight 기준)
 * @param budgetWon 총 예산 (총액 기준으로 이미 환산된 값)
 */
export function calcMixMetrics(params: {
  lines: readonly MixLine[];
  days: number;
  budgetWon: number;
  /** 미지정 시 전 타깃 */
  target?: TargetSpec;
}): MixMetrics {
  const days = Math.max(1, Math.floor(params.days));
  const lines = params.lines.map((l) => calcLineMetrics(l, days));

  let totalCostWon = 0;
  let totalImpressions = 0;
  const costBases: MetricBasis[] = [];
  const impBases: MetricBasis[] = [];

  for (const l of lines) {
    if (l.costWon) {
      totalCostWon += l.costWon.value;
      costBases.push(l.costWon.basis);
    } else {
      // 금액을 해석하지 못한 매체가 하나라도 있으면 합계는 추정이다
      costBases.push("default");
    }
    totalImpressions += l.impressions.value;
    impBases.push(l.impressions.basis);
  }

  // 혼합 CPM — 단일 진입점(calcCPM)과 동일한 정의: 금액 / 노출 × 1000.
  // 유형별 CPM_BOUNDS 는 혼합에 적용할 수 없지만, 터무니없는 값은 막는다:
  // - 총 노출 <= 0 이면 산정 불가
  // - CPM <= 0 이면 산정 불가 (총액·노출 불일치)
  let mixCpm: number | null = null;
  if (
    totalImpressions > 0 &&
    totalImpressions >= MIN_IMPRESSIONS_FOR_CPM &&
    totalCostWon > 0
  ) {
    const raw = Math.round((totalCostWon / totalImpressions) * 1000);
    mixCpm = raw > 0 ? raw : null;
  }

  const budgetWon = Math.max(0, params.budgetWon);
  const overBudgetWon = Math.max(0, totalCostWon - budgetWon);

  const excludedMediaIds = mediaIdsWithoutCoverage(params.lines);
  const reachWrap = tryCalcReach({
    lines: params.lines,
    days,
    target: params.target ?? {},
    dongs: buildDongProfilesFromLines(params.lines),
    coverageByMediaId: buildCoverageByMediaId(params.lines),
  });

  const reachFields = reachWrap
    ? {
        netReach: {
          value: Math.round(reachWrap.result.netReach),
          basis: REACH_METRIC_BASIS,
        },
        reachRate: {
          value: reachWrap.result.reachRate,
          basis: REACH_METRIC_BASIS,
        },
        frequency: {
          value: Math.round(reachWrap.result.frequency * 10) / 10,
          basis: REACH_METRIC_BASIS,
        },
        grp: {
          value: Math.round(reachWrap.result.grp * 10) / 10,
          basis: REACH_METRIC_BASIS,
        },
        reachMeta: reachWrap.meta,
      }
    : {
        netReach: null,
        reachRate: null,
        frequency: null,
        grp: null,
        reachMeta:
          excludedMediaIds.length > 0
            ? {
                includedCount: 0,
                excludedCount: excludedMediaIds.length,
                excludedMediaIds,
              }
            : null,
      };

  return {
    lines,
    totalCostWon: {
      value: totalCostWon,
      basis: weakestBasis(costBases),
    },
    totalImpressions: {
      value: totalImpressions,
      basis: weakestBasis(impBases),
    },
    mixCpmWon: {
      value: mixCpm,
      basis: weakestBasis([...costBases, ...impBases]),
    },

    ...reachFields,

    budgetWon,
    budgetUsedRate: budgetWon > 0 ? totalCostWon / budgetWon : 0,
    overBudgetWon,
    isOverBudget: overBudgetWon > 0,
  };
}

/**
 * 도달 지표 — coverage·모집단이 있는 매체만 포함.
 *
 * coverage NULL 매체는 제외하고 나머지로 계산한다 (전체 [산정 중] 아님).
 * `reachRate <= 1.0`, `netReach <= targetPopulation` 가드.
 */
export function tryCalcReach(params: {
  lines: readonly MixLine[];
  days: number;
  target: TargetSpec;
  dongs: readonly DongProfile[];
  coverageByMediaId: Readonly<
    Record<string, readonly { code: string; weight: number }[]>
  >;
  onError?: (message: string) => void;
}): TryCalcReachSuccess | null {
  const { dongs, coverageByMediaId, target } = params;
  const days = Math.max(1, Math.floor(params.days));

  if (dongs.length === 0) return null;

  const excludedMediaIds: string[] = [];
  const includedIds: string[] = [];

  const medias = params.lines
    .map((l) => {
      const coverageDongs = coverageByMediaId[l.media.id] ?? [];
      if (coverageDongs.length === 0) {
        excludedMediaIds.push(l.media.id);
        return null;
      }
      includedIds.push(l.media.id);
      const { dailyImpressions, totalImpressions } = calcImpressions({
        dailyTraffic: l.media.dailyFootTraffic ?? 0,
        contactRate: resolveContactRateWithBasis({
          type: l.media.type,
          subCategory: l.media.subCategory,
          name: l.media.name,
        }).value,
        sovShare: resolveSovShareWithBasis({
          type: l.media.type,
          subCategory: l.media.subCategory,
          name: l.media.name,
        }).value,
        units: l.units,
        days,
      });
      return {
        mediaId: l.media.id,
        dailyImpressions,
        totalImpressions,
        coverageDongs,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  if (medias.length === 0) return null;

  const result = calcNetReach({ medias, dongs, target, days });

  if (!Number.isFinite(result.reachRate) || result.reachRate > 1) {
    const msg = `[mix-metrics] reachRate > 1.0 (${result.reachRate}) — null 반환`;
    if (params.onError) params.onError(msg);
    else console.error(msg);
    return null;
  }

  if (
    !Number.isFinite(result.netReach) ||
    result.netReach > result.targetPopulation
  ) {
    const msg = `[mix-metrics] netReach > targetPopulation (${result.netReach} > ${result.targetPopulation}) — null 반환`;
    if (params.onError) params.onError(msg);
    else console.error(msg);
    return null;
  }

  const coveragePopCap = params.lines
    .filter((l) => includedIds.includes(l.media.id))
    .reduce((sum, l) => sum + (l.media.coveragePopulation ?? 0), 0);
  if (coveragePopCap > 0 && result.netReach > coveragePopCap * 1.01) {
    const msg = `[mix-metrics] netReach > coveragePopulation sum (${result.netReach} > ${coveragePopCap}) — null 반환`;
    if (params.onError) params.onError(msg);
    else console.error(msg);
    return null;
  }

  return {
    result,
    meta: {
      includedCount: medias.length,
      excludedCount: excludedMediaIds.length,
      excludedMediaIds,
    },
  };
}

/** 매체 유형별 CPM 정상 범위 — 화면 경고용 (엔진 CPM_BOUNDS 재사용) */
export function mixCpmOutOfBounds(
  media: MediaItem,
  cpmWon: number,
): boolean {
  const cls = classifyMedia({
    type: media.type,
    subCategory: media.subCategory,
    mainCategory: media.mediaCategory?.[0],
    name: media.name,
  });
  const [lo, hi] = CPM_BOUNDS[cls];
  return cpmWon < lo || cpmWon > hi;
}
