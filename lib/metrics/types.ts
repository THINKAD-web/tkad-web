/**
 * 계산 엔진 v2 — 공용 타입.
 *
 * 이 모듈은 순수 함수만 담는다. DB·React·fetch 의존 금지.
 * CPM·노출 계산은 `lib/metrics` 가 유일한 소스여야 한다 (D-03 근본 원인 제거).
 */

/**
 * CPM 정상 범위·가시율(contactRate) 기본값을 결정하는 매체 분류.
 *
 * 앞의 7개는 진단서 CPM_BOUNDS 스펙과 1:1 대응한다.
 * `airport` · `static_other` 는 760개 카탈로그가 7분류로 덮이지 않아 추가한
 * 확장 분류이며, 범위는 보수적으로(넓게) 잡아 오탐을 줄인다.
 */
export type MediaMetricClass =
  | "dooh_large"
  | "dooh_mid"
  | "subway_psd"
  | "subway_light"
  | "bus_exterior"
  | "bus_shelter"
  | "elevator_tv"
  | "airport"
  | "static_other";

/**
 * 판매 단위 — 가격의 분모와 노출의 분모를 강제로 일치시키기 위한 키 (D-02/D-05).
 * "1대에 80만원" 인데 노출이 전 노선 기준이면 CPM 이 200배 틀어진다.
 */
export type SellingUnit =
  | "panel" // 1면 (빌보드·전광판·벽면)
  | "vehicle" // 1대 (버스·택시)
  | "station" // 1개 역
  | "route" // 1개 노선
  | "site"; // 1개 지점 (엘리베이터·매장 등)

/** 노출 계산 입력 — 모든 매체를 동일한 정규화 단위로 환산한다. */
export type ImpressionInput = {
  /** OTS 모수 — 판매 단위 **1개** 기준 일 유동인구 */
  dailyTraffic: number;
  /** OTS → LTS 전환율 (0~1). 지나간 사람 중 실제로 시선이 닿는 비율 */
  contactRate: number;
  /** 내 소재 점유율 (0~1). 정적 매체는 1.0 */
  sovShare: number;
  /** 구매 수량 (버스 10대, 지하철 5개역 등) */
  units: number;
  /** 집행 일수 */
  days: number;
};

export type ImpressionResult = {
  /** 일 LTS 접촉 (traffic × contactRate × units — SOV 미적용) */
  dailyLtsContacts: number;
  /** 일 노출 (traffic × contactRate × sov × units) */
  dailyImpressions: number;
  /** 기간 총 노출 */
  totalImpressions: number;
};

/** SOV(loop 점유율) 산출 입력 (D-01) */
export type SovInput = {
  /** 소재 1회 재생 길이(초) */
  spotDuration?: number | null;
  /** loop 1회전 길이(초) */
  loopDuration?: number | null;
  /** 시간당 보장 재생 횟수 (loopDuration 대신 이 방식으로 판매되는 매체) */
  playsPerHour?: number | null;
  /** 정적 매체(빌보드·래핑·조명광고) — true 면 항상 1.0 */
  isStatic?: boolean;
};

/**
 * 기간별 실제 등록 상품가.
 * `days` 는 상품의 집행 일수, `price` 는 그 상품의 총액(원).
 */
export type PriceOption = {
  /** 상품 집행 일수 (7일 상품이면 7) */
  days: number;
  /** 상품 총액 (원) */
  price: number;
  label?: string;
  /** 견적 링크에 실어 보낼 옵션 식별자 (D-06) */
  id?: string;
};

/**
 * 가격 산출 근거.
 * - `exact`         등록된 상품과 일수가 정확히 일치 — 확정 단가
 * - `interpolated`  앞뒤 상품 사이 로그 보간 — 추정값
 * - `extrapolated`  최장 상품 초과 — 장기 할인 가정 추정값
 */
export type PriceBasis = "exact" | "interpolated" | "extrapolated";

export type PriceResult = {
  amount: number;
  basis: PriceBasis;
  /** basis === "exact" 일 때만 채워진다 */
  option?: PriceOption;
  /** UI 에 그대로 노출할 한국어 주석 */
  note?: string;
  /** true 면 UI 에 "추정값" 배지를 반드시 노출한다 */
  isEstimate: boolean;
};

export type CpmInput = {
  mediaId: string;
  mediaClass: MediaMetricClass;
  priceOptions: PriceOption[];
  days: number;
  dailyTraffic: number;
  contactRate: number;
  sovShare: number;
  units: number;
};

export type CpmFailureReason = "INSUFFICIENT_IMPRESSIONS" | "NO_PRICE";

export type CpmResult = {
  /** 원/1000회. 계산 불가 시 null */
  value: number | null;
  reason?: CpmFailureReason;
  /** 유형별 정상 범위를 벗어난 값 — 값은 남기되 광고주 대면 노출은 막는다 */
  warning?: "OUT_OF_RANGE";
  priceBasis?: PriceBasis;
  priceWon: number;
  impressions: number;
  bounds: readonly [number, number];
  /**
   * 광고주 대면 화면(홈 카드·목록·제안서)에 **숫자를 표시해도 되는지**.
   * false 면 "CPM 산정 중" 으로 대체하고 값은 관리자 화면에만 띄운다.
   */
  displayable: boolean;
};

// ─────────────────────────────────────────────────────────────────
// Reach / Frequency / GRP
// ─────────────────────────────────────────────────────────────────

/** 타깃 연령대 밴드 — Media.demoAgeSplit 키와 동일 */
export type AgeBand = "10s" | "20s" | "30s" | "40s" | "50s+";

export const AGE_BANDS: readonly AgeBand[] = [
  "10s",
  "20s",
  "30s",
  "40s",
  "50s+",
] as const;

export type Gender = "male" | "female";

/** 캠페인 타깃 정의. 미지정(undefined) = 전 타깃 */
export type TargetSpec = {
  genders?: readonly Gender[];
  ageBands?: readonly AgeBand[];
};

/** 행정동 인구 프로파일 — Reach 계산의 모집단 */
export type DongProfile = {
  code: string;
  population: number;
  /** 미입력 시 전국 평균으로 폴백 */
  genderSplit?: { male: number; female: number };
  ageSplit?: Partial<Record<AgeBand, number>>;
};

/** 매체가 커버하는 행정동과 그 안에서의 노출 배분 가중치 */
export type CoverageDong = {
  code: string;
  /** 이 매체 노출 중 해당 행정동에 귀속되는 비율 (매체별 합 = 1 권장) */
  weight: number;
};

export type PlannedMedia = {
  mediaId: string;
  /** 일 LTS — reach 확률(dailyP) 입력. SOV 미포함 */
  dailyLtsContacts: number;
  dailyImpressions: number;
  totalImpressions: number;
  coverageDongs: readonly CoverageDong[];
};

export type ReachResult = {
  /** 순 도달 인원 (중복 제거) */
  netReach: number;
  /** 타깃 모집단 */
  targetPopulation: number;
  /** 도달률 (0~1). 정의상 1.0 을 넘을 수 없다 */
  reachRate: number;
  /** 평균 접촉 빈도 = 총 노출 / 순 도달 */
  frequency: number;
  /** reachRate(%) × frequency */
  grp: number;
  /** 3회 이상 접촉한 인원 */
  effectiveReach: number;
  /** effectiveReach / targetPopulation */
  effectiveReachRate: number;
  /** 총 노출 */
  totalImpressions: number;
};
