/**
 * 계산 엔진 v2 — **공개 단일 진입점**.
 *
 * 노출 · CPM · 도달 계산은 전부 이 모듈을 통한다. 새 계산식을 화면 옆에
 * 만들지 말 것 (D-03 이 정확히 그렇게 생겼다).
 *
 * 사용 예 — 버스 외부 1대, 30일:
 * ```ts
 * const cls = classifyMedia({ mainCategory: "transit", subCategory: "bus_exterior" });
 * const cpm = calcCPM({
 *   mediaId, mediaClass: cls, days: 30, units: 1,
 *   dailyTraffic: busDailyTrafficPerVehicle(),
 *   contactRate: defaultContactRate(cls),
 *   sovShare: resolveSovShare({ isStatic: true }),
 *   priceOptions: [{ days: 30, price: 800_000 }],
 * });
 * publicCpmWon(cpm); // ₩4,233
 * ```
 */
export { METRICS_ENGINE_VERSION } from "./constants";
export {
  CPM_BOUNDS,
  DAYS_PER_MONTH,
  DEFAULT_CONTACT_RATE,
  DONG_CORRELATION_RHO,
  EFFECTIVE_REACH_MIN_CONTACTS,
  LONG_TERM_DISCOUNT,
  MAX_DAILY_FREQ,
  MIN_IMPRESSIONS_FOR_CPM,
} from "./constants";

export {
  classifyMedia,
  defaultContactRate,
  defaultSellingUnit,
  isStaticMedia,
  DOOH_LARGE_AREA_M2,
  type ClassifyInput,
} from "./classify";

export {
  busDailyTrafficPerVehicle,
  calcImpressions,
  exceedsPopulationCeiling,
  hasSovBasis,
  resolveSovShare,
} from "./impressions";

export {
  linearMonthlyDeviation,
  normalizePriceOptions,
  periodToDays,
  resolvePrice,
  PERIOD_DAYS,
} from "./price";

export {
  calcCPM,
  cpmBoundsFor,
  isCpmInRange,
  publicCpmWon,
  setCpmAnomalyReporter,
  type CpmAnomaly,
} from "./cpm";

export { calcNetReach, resolveTargetPopulation } from "./reach";

export { buildQuoteParams, daysToPeriodKey, type QuoteParams } from "./quote-params";

export type {
  AgeBand,
  CoverageDong,
  CpmFailureReason,
  CpmInput,
  CpmResult,
  DongProfile,
  Gender,
  ImpressionInput,
  ImpressionResult,
  MediaMetricClass,
  PlannedMedia,
  PriceBasis,
  PriceOption,
  PriceResult,
  ReachResult,
  SellingUnit,
  SovInput,
  TargetSpec,
} from "./types";

export { AGE_BANDS } from "./types";
