/**
 * CPM — **단일 진입점**.
 *
 * 홈 카드·목록·상세·유사매체·제안서는 전부 이 함수를 통해야 한다.
 * 계산이 두 곳 이상에 존재하는 순간 같은 매체가 페이지마다 다른 숫자를
 * 보여주게 된다 (D-03: M-CITY 홈 ₩954,545 vs 상세 ₩31,818).
 */
import { CPM_BOUNDS, MIN_IMPRESSIONS_FOR_CPM } from "./constants";
import { calcImpressions } from "./impressions";
import { resolvePrice } from "./price";
import type { CpmInput, CpmResult, MediaMetricClass } from "./types";

export type CpmAnomaly = {
  mediaId: string;
  mediaClass: MediaMetricClass;
  cpm: number;
  expected: readonly [number, number];
};

type AnomalyReporter = (anomaly: CpmAnomaly) => void;

let reportAnomaly: AnomalyReporter = () => {};

/**
 * 범위 이탈 CPM 수집기 등록 (Sentry·감사 리포트 등).
 * 미등록 시 no-op — 순수성을 유지하기 위해 기본값은 아무것도 하지 않는다.
 */
export function setCpmAnomalyReporter(reporter: AnomalyReporter): void {
  reportAnomaly = reporter;
}

/** 유형별 CPM 정상 범위 */
export function cpmBoundsFor(
  mediaClass: MediaMetricClass,
): readonly [number, number] {
  return CPM_BOUNDS[mediaClass];
}

export function isCpmInRange(
  cpm: number,
  mediaClass: MediaMetricClass,
): boolean {
  const [lo, hi] = CPM_BOUNDS[mediaClass];
  return cpm >= lo && cpm <= hi;
}

export function calcCPM(input: CpmInput): CpmResult {
  const bounds = CPM_BOUNDS[input.mediaClass];

  const { totalImpressions } = calcImpressions({
    dailyTraffic: input.dailyTraffic,
    contactRate: input.contactRate,
    sovShare: input.sovShare,
    units: input.units,
    days: input.days,
  });

  const price = resolvePrice(input.priceOptions, input.days);
  if (!price) {
    return {
      value: null,
      reason: "NO_PRICE",
      priceWon: 0,
      impressions: totalImpressions,
      bounds,
      displayable: false,
    };
  }

  if (totalImpressions < MIN_IMPRESSIONS_FOR_CPM) {
    return {
      value: null,
      reason: "INSUFFICIENT_IMPRESSIONS",
      priceWon: price.amount,
      impressions: totalImpressions,
      bounds,
      displayable: false,
    };
  }

  const cpm = (price.amount / totalImpressions) * 1000;

  if (!isCpmInRange(cpm, input.mediaClass)) {
    reportAnomaly({
      mediaId: input.mediaId,
      mediaClass: input.mediaClass,
      cpm,
      expected: bounds,
    });
    // 값은 남긴다 (관리자 화면·감사용). 다만 광고주에게는 보여주지 않는다.
    return {
      value: cpm,
      warning: "OUT_OF_RANGE",
      priceBasis: price.basis,
      priceWon: price.amount,
      impressions: totalImpressions,
      bounds,
      displayable: false,
    };
  }

  return {
    value: cpm,
    priceBasis: price.basis,
    priceWon: price.amount,
    impressions: totalImpressions,
    bounds,
    displayable: true,
  };
}

/**
 * 광고주 대면 화면에 쓸 CPM 값.
 * `displayable === false` 면 null — 호출부는 "CPM 산정 중" 으로 대체한다.
 * 틀린 숫자를 보여주는 것보다 안 보여주는 것이 낫다.
 */
export function publicCpmWon(result: CpmResult): number | null {
  if (!result.displayable || result.value == null) return null;
  return Math.round(result.value);
}
