/**
 * 노출 수 모델.
 *
 * 핵심 구분 — 이 셋을 섞으면 D-01/D-02 같은 스케일 오차가 난다:
 *   OTS  (Opportunity To See)  지나간 사람 수          → dailyTraffic
 *   LTS  (Likelihood To See)   그중 시선이 닿은 사람    → × contactRate
 *   노출 (Impression)          그중 **내 소재**를 본 사람 → × sovShare
 */
import {
  BUS_DEFAULT_EXPOSURE_PER_TRIP,
  BUS_DEFAULT_ROUND_TRIPS_PER_DAY,
} from "./constants";
import type { ImpressionInput, ImpressionResult, SovInput } from "./types";

function positive(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0;
  return value;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * 내 소재 점유율(SOV).
 *
 * D-01 의 수정 지점: DOOH 는 loop 안에서 여러 광고주가 자리를 나눠 쓴다.
 * 15초 소재 / 300초 loop 이면 내가 사는 것은 노출의 5% 다. 이걸 빼먹으면
 * 노출이 20배 부풀고 CPM 이 1/20 로 줄어든다.
 */
export function resolveSovShare(input: SovInput): number {
  if (input.isStatic) return 1;

  const spot = positive(input.spotDuration);

  // loop 방식: 내 소재 길이 / loop 1회전 길이
  const loop = positive(input.loopDuration);
  if (spot > 0 && loop > 0) return clamp01(spot / loop);

  // 시간당 재생 보장 방식: (소재 길이 × 시간당 재생 수) / 3600초
  const plays = positive(input.playsPerHour);
  if (spot > 0 && plays > 0) return clamp01((spot * plays) / 3600);

  // SOV 근거가 없는 디지털 매체는 계산 불가 — 1.0 으로 가정하면
  // 정확히 D-01 을 재현하게 되므로, 호출부가 감지할 수 있도록 0 을 준다.
  return 0;
}

/** SOV 산출 근거가 있는지 — 없으면 노출을 계산하면 안 된다 (R-04) */
export function hasSovBasis(input: SovInput): boolean {
  return resolveSovShare(input) > 0;
}

/**
 * 버스 1대 기준 일 OTS (D-02).
 *
 * 버스 광고의 분모는 노선 인구가 아니라 **1대가 하루에 만나는 사람 수**다.
 * 서울 인구 940만을 분모로 쓰면 버스 1대가 시민 전원에게 4번씩 노출된다는
 * 물리적으로 불가능한 숫자가 나온다.
 */
export function busDailyTrafficPerVehicle(params?: {
  roundTripsPerDay?: number | null;
  exposurePerTrip?: number | null;
}): number {
  const trips =
    positive(params?.roundTripsPerDay) || BUS_DEFAULT_ROUND_TRIPS_PER_DAY;
  const perTrip =
    positive(params?.exposurePerTrip) || BUS_DEFAULT_EXPOSURE_PER_TRIP;
  return Math.round(trips * perTrip);
}

/**
 * 정규화된 노출 계산.
 * `dailyTraffic` 은 반드시 **판매 단위 1개 기준**이어야 한다.
 */
export function calcImpressions(input: ImpressionInput): ImpressionResult {
  const traffic = positive(input.dailyTraffic);
  const contact = clamp01(input.contactRate);
  const sov = clamp01(input.sovShare);
  const units = Math.max(0, Math.floor(positive(input.units) || 0));
  const days = Math.max(0, Math.floor(positive(input.days) || 0));

  const dailyImpressions = Math.round(traffic * contact * sov * units);
  const totalImpressions = Math.round(dailyImpressions * days);

  return { dailyImpressions, totalImpressions };
}

/**
 * 인구 상한 검사 (R-01).
 * 커버 지역 생활인구 × 일수 × 1인 최대 접촉 횟수를 넘는 노출은 불가능하다.
 */
export function exceedsPopulationCeiling(params: {
  totalImpressions: number;
  coveragePopulation: number;
  days: number;
  maxDailyFreq: number;
}): boolean {
  const pop = positive(params.coveragePopulation);
  if (pop <= 0) return false; // 모집단 미상 — 이 규칙으로는 판정 불가
  const ceiling = pop * Math.max(1, params.days) * params.maxDailyFreq;
  return params.totalImpressions > ceiling;
}
