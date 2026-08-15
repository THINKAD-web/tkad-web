/**
 * 계산 엔진 v2 — 상수.
 *
 * 여기 값을 바꾸면 과거 제안서 숫자가 소급 변경된다.
 * 반드시 `METRICS_ENGINE_VERSION` 을 함께 올리고, 저장된 제안서는
 * `CampaignPlan.engineVersion` 스냅샷을 기준으로 재현한다.
 */
import type { MediaMetricClass } from "./types";

/**
 * 계산 로직 버전. 식·상수가 바뀔 때마다 올린다.
 * 제안서 스냅샷에 함께 저장되어 "그때 그 숫자" 재현을 보장한다.
 */
export const METRICS_ENGINE_VERSION = "v2.0.0";

/** 일↔월 환산 기준 일수 (기존 `MEDIA_DAYS_PER_MONTH` 와 동일값 유지) */
export const DAYS_PER_MONTH = 30;

/**
 * 인구 상한 검사(R-01)에 쓰는 1인당 일 최대 접촉 횟수.
 * 같은 사람이 하루에 같은 매체를 4번 넘게 보지는 않는다고 본다.
 */
export const MAX_DAILY_FREQ = 4;

/**
 * CPM(원/1000회) 정상 범위 — 유형별.
 * 범위 밖 = 데이터 오류로 간주하고 광고주 대면 화면에서 숫자를 감춘다.
 * 특히 1,000원 미만 CPM 은 사실상 단위 오류다 (버스 ₩32 사례, D-02).
 */
export const CPM_BOUNDS: Record<MediaMetricClass, readonly [number, number]> = {
  dooh_large: [8_000, 60_000],
  dooh_mid: [5_000, 40_000],
  subway_psd: [3_000, 25_000],
  subway_light: [2_000, 15_000],
  bus_exterior: [1_500, 12_000],
  bus_shelter: [3_000, 20_000],
  elevator_tv: [2_000, 15_000],
  // ── 스펙 확장 (7분류로 덮이지 않는 카탈로그 대응, 보수적으로 넓게) ──
  airport: [5_000, 45_000],
  static_other: [1_500, 45_000],
};

/**
 * OTS → LTS 전환율(가시율) 기본값.
 * 매체별 실측(`Media.contactRate`)이 있으면 그것이 우선한다.
 */
export const DEFAULT_CONTACT_RATE: Record<MediaMetricClass, number> = {
  /** 신호 대기 중 시선 확보 */
  dooh_large: 0.3,
  dooh_mid: 0.2,
  /** 대기 시간이 길어 최고 */
  subway_psd: 0.45,
  subway_light: 0.3,
  /** 이동 중, 짧은 노출 */
  bus_exterior: 0.15,
  /** 대기 중 */
  bus_shelter: 0.4,
  /** 밀폐·강제 시선 */
  elevator_tv: 0.55,
  /** 체류 시간 김 */
  airport: 0.35,
  static_other: 0.25,
};

/**
 * 버스 1대 기준 일 OTS 기본값 (D-02).
 * 버스는 노선 전체가 아니라 **1대가 하루에 만나는 사람 수**가 분모다.
 *   12 왕복 × 3,500명 = 42,000
 *   검산: 42,000 × 0.15 × 1.0 × 1대 × 30일 = 189,000 회
 *        CPM = 800,000 / 189,000 × 1000 = ₩4,233 → bus_exterior 정상 범위
 */
export const BUS_DEFAULT_ROUND_TRIPS_PER_DAY = 12;
export const BUS_DEFAULT_EXPOSURE_PER_TRIP = 3_500;

/**
 * **판매 단위 1개** 가 하루에 만날 수 있는 현실적 최대 유동인구 (R-01/R-05).
 *
 * 이 값을 넘는 `dailyTraffic` 은 거의 항상 분모가 판매 단위가 아니라
 * 노선·지역 전체로 잡혀 있다는 뜻이다 (버스 1대에 서울 인구 940만).
 */
export const PLAUSIBLE_DAILY_TRAFFIC_PER_UNIT: Record<MediaMetricClass, number> =
  {
    dooh_large: 1_500_000,
    dooh_mid: 600_000,
    subway_psd: 800_000,
    subway_light: 800_000,
    /** 버스 1대: 14 왕복 × 5,000명 여유를 둔 상한 */
    bus_exterior: 200_000,
    bus_shelter: 150_000,
    elevator_tv: 50_000,
    airport: 300_000,
    static_other: 1_000_000,
  };

/** CPM 을 산출하기 위한 최소 노출 — 이 미만이면 CPM 을 계산하지 않는다 */
export const MIN_IMPRESSIONS_FOR_CPM = 1_000;

/**
 * 등록된 최장 상품을 넘는 기간의 일할 환산에 적용하는 장기 할인.
 * OOH 는 기간이 길수록 단가가 떨어지므로 선형 환산은 항상 과다 견적이 된다 (D-04).
 */
export const LONG_TERM_DISCOUNT = 0.85;

/**
 * 동일 행정동 내 매체 간 노출 상관계수.
 * 같은 동네의 두 매체는 상당 부분 같은 사람이 본다 — 0 이면 독립(과대 도달),
 * 1 이면 완전 중복. 0.7 은 국내 OOH 플래닝 관행치.
 */
export const DONG_CORRELATION_RHO = 0.7;

/** 유효 도달(effective reach) 기준 접촉 횟수 */
export const EFFECTIVE_REACH_MIN_CONTACTS = 3;

/** 1인 1일 접촉 확률 상한 — 1.0 이면 기간 도달이 즉시 100% 가 되어 비현실적 */
export const MAX_DAILY_CONTACT_PROBABILITY = 0.95;

/** 성별·연령 데이터가 없는 행정동에 쓰는 전국 평균 폴백 */
export const NATIONAL_GENDER_SPLIT = { male: 0.499, female: 0.501 } as const;

export const NATIONAL_AGE_SPLIT = {
  "10s": 0.09,
  "20s": 0.13,
  "30s": 0.14,
  "40s": 0.16,
  "50s+": 0.48,
} as const;
