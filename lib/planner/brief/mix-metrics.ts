/**
 * PR-6b 믹스 지표 — 브리프 + 선택 매체 → 지표 패널 값.
 *
 * 엔진(`lib/metrics/*`)은 건드리지 않는다. 이 파일은 어댑터다:
 * MediaItem 을 엔진 입력으로 변환하고, 기본값을 쓴 경우 그 근거(basis)를
 * 값과 함께 올려보낸다.
 *
 * ## 계산 가능 3개 / 산정 불가 4개
 *
 * 행정동 인구 데이터가 리포지토리·DB 어디에도 없다. 따라서 모집단이
 * 분모인 지표(순 도달·도달률·평균 빈도·GRP)는 **계산을 시도하지 않고
 * null 을 반환한다.** 없는 데이터로 숫자를 만들지 않는다.
 *
 *   계산 가능 : 예산 소진 · 총 노출 · 혼합 CPM
 *   산정 불가 : 순 도달 · 도달률 · 평균 빈도 · GRP  → 인구 데이터 연동 후
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
import type { DongProfile, TargetSpec } from "@/lib/metrics/types";

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

  // ── 산정 불가 (행정동 인구 데이터 연동 후 제공) ──
  netReach: null;
  reachRate: null;
  frequency: null;
  grp: null;

  // ── 예산 ──
  budgetWon: number;
  /** 예산 소진율 (0~1+, 초과 시 1 초과) */
  budgetUsedRate: number;
  /** 예산 초과분 (초과 없으면 0) */
  overBudgetWon: number;
  isOverBudget: boolean;
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
  // 노출이 최소 기준 미만이면 산정하지 않는다.
  let mixCpm: number | null = null;
  if (totalImpressions >= MIN_IMPRESSIONS_FOR_CPM && totalCostWon > 0) {
    mixCpm = Math.round((totalCostWon / totalImpressions) * 1000);
  }

  const budgetWon = Math.max(0, params.budgetWon);
  const overBudgetWon = Math.max(0, totalCostWon - budgetWon);

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

    // 모집단 없음 → 계산 시도조차 하지 않는다
    netReach: null,
    reachRate: null,
    frequency: null,
    grp: null,

    budgetWon,
    budgetUsedRate: budgetWon > 0 ? totalCostWon / budgetWon : 0,
    overBudgetWon,
    isOverBudget: overBudgetWon > 0,
  };
}

/**
 * 도달 지표 — **모집단이 있을 때만** 계산한다.
 *
 * 현재는 행정동 인구 데이터가 없어 항상 `null` 을 반환한다. 인구 데이터가
 * 연동되면 `dongs` 가 채워지고 이 경로가 살아난다(별도 트랙, PR-4 동반).
 *
 * `reachRate <= 1.0` 가드는 그때를 위해 살려 둔다 — 도달률이 100% 를
 * 넘는 것은 정의상 불가능하므로, 넘으면 계산이 틀린 것이다.
 */
export function tryCalcReach(params: {
  lines: readonly MixLine[];
  days: number;
  target: TargetSpec;
  /** 행정동 인구 프로파일. 비어 있으면 계산하지 않는다 */
  dongs: readonly DongProfile[];
  /** 매체별 커버 행정동. 비어 있으면 계산하지 않는다 */
  coverageByMediaId: Readonly<Record<string, readonly { code: string; weight: number }[]>>;
  onError?: (message: string) => void;
}): ReturnType<typeof calcNetReach> | null {
  const { dongs, coverageByMediaId, target } = params;
  const days = Math.max(1, Math.floor(params.days));

  // 모집단이 없으면 시도하지 않는다 — 없는 데이터로 숫자를 만들지 않는다.
  if (dongs.length === 0) return null;

  const medias = params.lines
    .map((l) => {
      const coverageDongs = coverageByMediaId[l.media.id] ?? [];
      if (coverageDongs.length === 0) return null;
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

  // 도달률은 정의상 1.0 을 넘을 수 없다. 넘으면 계산이 틀린 것이므로
  // 화면에 내보내지 않는다.
  if (!Number.isFinite(result.reachRate) || result.reachRate > 1) {
    const msg = `[mix-metrics] reachRate 가 1.0 을 초과했습니다 (${result.reachRate}). 모집단·커버리지 입력을 확인하세요.`;
    if (params.onError) params.onError(msg);
    else console.error(msg);
    return null;
  }

  return result;
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
