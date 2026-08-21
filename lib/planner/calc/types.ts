/**
 * CalcEngine 타입 정의 (Phase A-1, STEP 2)
 *
 * 목적 — 캠페인 보고서의 모든 지표를 `PlanResult` 하나로 통일한다.
 * 화면·PDF·저장 플랜은 이 객체만 소비하고, 섹션별 재계산을 하지 않는다.
 *
 * 설계 원칙
 *   1. 기간은 일(day) 단위가 유일한 SSOT. months 는 표시용 파생값일 뿐이다.
 *      기존 `Math.max(1, months)` / `Math.round(days/30)` 클램프가 21일 캠페인을
 *      1개월로 왜곡시켰다 (regional-breakdown.ts:204, region-subdivision.ts:150,
 *      brief-integrated-adapters.ts:84, brief-report-adapter.ts:219).
 *   2. 노출은 `PlanMediaItem.monthlyImpressions` 에서만 파생한다.
 *      daily / campaignTotal 을 각자 계산하던 경로를 모두 흡수한다.
 *   3. 금액 정책은 엔진 밖에 둔다. `itemNet` 을 입력으로 받고 엔진은 검증·경고만 한다 (A-6).
 *   4. 도달(reach)은 포트폴리오 전체 단위에서만 산출한다. 지역·구 단위 도달은
 *      포화 모델 상수(0.4013)를 반복 출력할 뿐이므로 타입에서 아예 제외한다.
 */

import type { MediaItem } from "@/lib/media-data";
import type {
  PlannerCampaignGoal,
  PlannerCategory,
} from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";

/** 공개 카탈로그 매체 유형 — `CATALOG_MEDIA_TYPES` 와 동일 (digital·static·mobile) */
export type PlanMediaType = PlannerCategory;

export const PLAN_ENGINE_VERSION = "a1.0";

/** 노출 30일 환산 기준 — `MEDIA_DAYS_PER_MONTH` 와 동일 값 */
export const PLAN_DAYS_PER_MONTH = 30;

// ---------------------------------------------------------------------------
// 입력
// ---------------------------------------------------------------------------

/**
 * 기간 입력 — 세 경로를 모두 수용하고 엔진 내부에서 일수로 정규화한다.
 *   - `flight` : 브리프 경로 (`CampaignBriefInput.flightStart` / `flightEnd`)
 *   - `days`   : 견적 경로 (`resolveQuoteCampaignDaysFromParams`)
 *   - `months` : /planner 위저드 프리셋 (`PLANNER_PERIOD_OPTIONS`)
 */
export type PlanPeriodInput =
  | { kind: "flight"; startDate: string; endDate: string }
  | { kind: "days"; days: number }
  | { kind: "months"; months: number };

/**
 * 월노출을 어느 DB 필드에서 해소했는지 — 값이 아니라 **출처** 를 기록한다.
 *
 * `Media.impressions` 와 `Media.dailyFootfall` 은 각각 독립 nullable 컬럼이고,
 * 둘 다 자동 계산·admin 잠금 필드다. `impressions = dailyFootfall × 30` 을
 * 강제하는 제약이 스키마에도 저장 경로에도 없다.
 * 그래서 코드베이스에 우선순위가 다른 해소 함수가 3개 공존한다.
 *
 *   1. `resolveMonthlyImpressions`  (media-metrics.ts:33 — 목록·카드 SSOT)
 *      impressions → monthlyFootTraffic → daily×30
 *   2. `baseMonthlyImpressions`     (media-quantity.ts:289 — 견적·플래너)
 *      monthlyFootTraffic → daily×30   ※ impressions 를 아예 보지 않음
 *   3. `resolveDailyTraffic`        (document-media-detail.ts:96 — PDF 카드)
 *      dailyFootTraffic → impressions/30
 *
 * 어느 것을 정본으로 삼을지는 CPM·금액을 바꾸므로 A-1 이 단독으로 정하지 않는다
 * (media-quantity.ts:287 「금전 민감 — 임의 변경 금지」).
 * A-1 은 현행 플래너 기준(2번)을 유지하면서 출처를 드러내고,
 * 값이 서로 어긋나면 `IMPRESSIONS_BASIS_CONFLICT` 경고를 남긴다.
 */
export type PlanImpressionsBasis =
  /** `Media.impressions` 직접 사용 */
  | "impressions"
  /** `monthlyFootTraffic` 직접 사용 */
  | "monthlyFootTraffic"
  /** `dailyFootfall × 30` 환산 */
  | "dailyDerived"
  /** 셋 다 없음 — 0 으로 집계 */
  | "none";

/** `impressions` 와 `dailyFootfall × 30` 이 이 비율을 넘게 어긋나면 경고 */
export const IMPRESSIONS_BASIS_CONFLICT_TOLERANCE = 0.05;

export type PlanMediaInput = {
  media: MediaItem;
  /** 수량 (모빌리티 대수·네트워크 유닛). 미지정 = 매체 기본값 */
  units?: number;
  /**
   * 캠페인 기간 순액(원). **엔진이 계산하지 않는다.**
   * 부분기간 요율 적용 여부·선형 폴백 여부는 호출자(A-6) 정책이다.
   * 엔진은 이 값을 그대로 합산하고, 기간이 운영 요율 키와 어긋나면 경고만 남긴다.
   */
  itemNet: number;
};

export type CalcPlanInput = {
  media: readonly PlanMediaInput[];
  period: PlanPeriodInput;
  /** 사용자 입력 예산(원). 0 이하면 예산 사용률 계산을 건너뛴다 */
  budgetWon: number;
  goal?: PlannerCampaignGoal | null;
  industryKey?: PlannerIndustryKey | null;
  locale?: "ko" | "en";
  planId?: string | null;
  /** 지역 도달 중복 할인 계수 (0~1). 기본 0.45 */
  regionUniqueFactor?: number;
  /** 계산 시각 주입 (테스트 결정성). 미지정 시 `new Date()` */
  now?: Date;
};

// ---------------------------------------------------------------------------
// 기간
// ---------------------------------------------------------------------------

export type PlanPeriod = {
  /** ISO `YYYY-MM-DD`. 프리셋·일수 입력이면 null */
  startDate: string | null;
  endDate: string | null;
  /** 1 이상 정수. 기간의 유일한 SSOT — 모든 노출·금액 계산이 이 값을 쓴다 */
  days: number;
  /**
   * `days / 30`. **표시·레거시 호환 전용.**
   * 반올림·클램프 없이 그대로 둔다 (21일 → 0.7). 계산 입력으로 쓰지 말 것.
   */
  monthsEquivalent: number;
  source: PlanPeriodInput["kind"];
  /**
   * 운영 부분기간 요율 키(1/3/5/7/15/30일)와 정확히 일치하면 그 키, 아니면 null.
   * null 이면 `PERIOD_NO_EXACT_RATE_KEY` 경고를 발행한다.
   */
  exactRateKey: string | null;
};

// ---------------------------------------------------------------------------
// 금액
// ---------------------------------------------------------------------------

export type PlanMoney = {
  currency: "KRW";
  /** 캠페인 기간 매체 순액 합계 = sum(mediaItems[].itemNet) */
  mediaNet: number;
  /** 사용자 입력 예산 */
  budgetInput: number;
};

export type PlanBudgetUsage = {
  budgetWon: number;
  /** = money.mediaNet */
  usedWon: number;
  /** 0~ (100 초과 가능). budgetWon <= 0 이면 0 */
  usagePct: number;
  /** 음수 = 초과 */
  remainingWon: number;
  status: "under" | "fit" | "over";
};

// ---------------------------------------------------------------------------
// 노출 · CPM · 도달
// ---------------------------------------------------------------------------

export type PlanImpressions = {
  /** 일평균 노출 합계 = sum(mediaItems[].dailyImpressions) */
  daily: number;
  /** 30일 환산 노출 = sum(mediaItems[].monthlyImpressions). 카탈로그 단가 비교용 */
  monthlyEquivalent: number;
  /**
   * 캠페인 총 노출 = daily × period.days.
   * 화면·PDF·저장 플랜의 **유일한** 총노출 값.
   */
  campaignTotal: number;
};

export type PlanCpm = {
  /** 캠페인 기준 = money.mediaNet / (impressions.campaignTotal / 1000). 분모 0 이면 null */
  campaignWon: number | null;
  /** 30일 환산 기준 — 카탈로그 단가와 비교할 때만 사용 */
  monthlyWon: number | null;
};

/**
 * 추정 도달 — **포트폴리오 전체 단위에서만** 산출한다.
 *
 * 포화 모델 `pool × (1 − e^(−impressions/pool))` 은 지역 오디언스 풀이 충분히
 * 클 때만 의미가 있다. 지역·구 단위로 쪼개 매체가 1개만 남으면
 * `f × (1 − e^(−1/f))` = 0.401234 (f=0.45) 라는 상수가 항상 나온다.
 * 따라서 `Share` 에는 도달 필드를 두지 않는다 (의도된 설계, 누락 아님).
 */
export type PlanReach = {
  /** `estimating` = 실측 데이터 연동 전. 이때 value·frequency 는 항상 null */
  status: "estimating" | "modeled";
  value: number | null;
  /** 1인당 평균 노출 횟수. value 가 null 이면 null */
  frequency: number | null;
  model: "saturation" | null;
  regionUniqueFactor: number | null;
};

// ---------------------------------------------------------------------------
// 비중 (Share)
// ---------------------------------------------------------------------------

/**
 * 집계 단위 1행 — 카테고리·권역·구 표가 모두 이 타입을 쓴다.
 * 예산 비중과 노출 비중을 **한 번에** 계산해 두 값의 정렬 순서가 어긋나지 않게 한다.
 *
 * 도달 필드 없음 — `PlanReach` 주석 참조.
 */
export type Share = {
  key: string;
  labelKo: string;
  labelEn: string;
  /** 캠페인 기간 순액(원) */
  budgetAmount: number;
  /** 0~100 (%) */
  budgetShare: number;
  /** 캠페인 총 노출 */
  impressions: number;
  /** 0~100 (%) */
  impressionShare: number;
  cpmWon: number | null;
  mediaCount: number;
};

export type PlanBreakdown = {
  /** digital · static · mobile */
  byCategory: Share[];
  /** 탐색 카테고리 (`plannerBrowseCategoryKey`) */
  byBrowseCategory: Share[];
  /** 권역 (`MediaRegionZoneId`) */
  byRegion: Share[];
  /** 구·세부 구역 (`MEDIA_BROWSE_REGIONS`) */
  byRegionSub: Share[];
};

// ---------------------------------------------------------------------------
// 매체
// ---------------------------------------------------------------------------

export type PlanRegionRef = {
  /** 광역 — seoul · busan · jeju · national */
  macro: string;
  /** 권역 코드 (`MediaRegionZoneId`). 매핑 실패 시 null */
  zoneId: string | null;
  /** 세부 구역 코드 (`MEDIA_BROWSE_REGIONS`). 매핑 실패 시 null */
  subId: string | null;
  labelKo: string;
  labelEn: string;
  /**
   * false = 매핑 실패. 폴백 라벨을 사실인 것처럼 표시하지 말 것.
   * (서울대입구역이 "구로/신도림"으로 출력되던 원인 — browse 택소노미에 관악 부재)
   */
  mapped: boolean;
};

export type PlanMediaItem = {
  id: string;
  name: string;
  /** 카탈로그 3종과 일치할 때만 값. 불일치 시 null + `MEDIA_TYPE_UNKNOWN` 경고 */
  type: PlanMediaType | null;
  /** DB 원본 `Media.type` */
  rawType: string;
  /** 보고서 대분류 키 (`plannerReportCategoryKey`) */
  categoryKey: string;
  /** 탐색 카테고리 키 (`plannerBrowseCategoryKey`) */
  browseCategoryKey: string;
  region: PlanRegionRef;
  units: number;
  /**
   * 30일 환산 노출 (수량 반영) — 매체 노출의 **해소된 기준값**.
   * 원본 DB 필드가 아니라 `impressionsBasis` 순서로 해소한 결과다.
   * daily·campaign 은 모두 이 값에서 파생시켜 세 값의 비율을 고정한다.
   */
  monthlyImpressions: number;
  /** monthlyImpressions 를 어느 필드에서 해소했는지 */
  impressionsBasis: PlanImpressionsBasis;
  /** = monthlyImpressions / 30 */
  dailyImpressions: number;
  /**
   * `dailyFootfall` 원본값. `dailyImpressions` 와 다를 수 있다.
   * 현재 PDF 매체 카드("일일 노출 165,000회")가 쓰는 값이라 표시 호환용으로 보존한다.
   * **비중·정렬·CPM 계산에 쓰지 말 것** — 순서 역전의 원인이었다.
   */
  rawDailyFootTraffic: number | null;
  /** = dailyImpressions × period.days */
  campaignImpressions: number;
  /** 캠페인 기간 순액(원) — 입력값 그대로 (엔진 미계산) */
  itemNet: number;
  /** 포트폴리오 내 노출 비중 0~100 (%) */
  impressionShare: number;
  /** 포트폴리오 내 예산 비중 0~100 (%) */
  budgetShare: number;
  cpmWon: number | null;
  /** 0~1 정규화 가시성 */
  visibilityNorm: number;
};

// ---------------------------------------------------------------------------
// 경고
// ---------------------------------------------------------------------------

export const PLAN_WARNING_CODES = [
  /**
   * 캠페인 일수가 운영 부분기간 요율 키(1/3/5/7/15/30일)와 정확히 일치하지 않음.
   * 호출자가 선형 폴백(월정가 × days/30)을 탔을 가능성이 높다.
   *
   * A-6 착수 시 반드시 함께 확인할 것 — 2주 프리셋도 같은 함정에 빠진다.
   *   PLANNER_PERIOD_OPTIONS 의 `2w` = 14/30 개월 → round(14) = 14일
   *   → `15days` 키와 불일치 → null → 선형 폴백.
   *   레거시 alias 는 `"2weeks" → "15days"` 로 매핑돼 있으나 (media-partial-period-rates.ts:52)
   *   플래너는 14일을 계산하므로 이 alias 를 영영 타지 못한다.
   *   21일(3주)은 키 자체가 폐기됨 — 같은 파일 46행 주석.
   */
  "PERIOD_NO_EXACT_RATE_KEY",
  /** flight 날짜 없이 일수·개월만 주어짐 — 보고서에 정확한 기간 표기 불가 */
  "PERIOD_MISSING_FLIGHT_DATES",
  /** 권역 매핑 실패 — 폴백 라벨 표시 금지 */
  "REGION_UNMAPPED",
  /** 세부 구역 매핑 실패 */
  "REGION_SUB_UNMAPPED",
  /** `Media.type` 이 digital·static·mobile 중 어느 것도 아님 */
  "MEDIA_TYPE_UNKNOWN",
  /** impressions·monthlyFootTraffic·dailyFootTraffic 모두 없음 — 노출 0 으로 집계됨 */
  "MEDIA_IMPRESSIONS_MISSING",
  /**
   * `Media.impressions` 와 `dailyFootfall × 30` 이 허용 오차를 넘게 어긋남.
   * 어느 쪽을 정본으로 볼지에 따라 CPM·비중이 달라진다 — A-4 데이터 정합 대상.
   */
  "IMPRESSIONS_BASIS_CONFLICT",
  /** itemNet 이 0 이하 — 예산 비중·CPM 왜곡 */
  "MEDIA_PRICE_MISSING",
  /** 매체 순액이 입력 예산을 초과 */
  "BUDGET_OVER",
  /** 예산 소진율이 현저히 낮음 */
  "BUDGET_UNDER_UTILIZED",
  /** 도달이 모델 산출 전 상태 (status = "estimating") */
  "REACH_NOT_MODELED",
] as const;

export type PlanWarningCode = (typeof PLAN_WARNING_CODES)[number];

/**
 * 경고의 성격 — 고쳐야 할 대상이 누구인지로 나눈다.
 *
 *   `data` : 매체 레코드·요율 테이블이 부실해서 뜬다. 운영자가 고친다 (A-4·A-6).
 *            보고서에서는 하단 데이터 출처 각주로 모은다.
 *   `plan` : 데이터는 멀쩡하고 사용자가 그렇게 구성했다. 사용자가 조정한다.
 *            보고서·위저드에서는 예산 카드 옆 실시간 힌트로 붙인다.
 *
 * 엔진 자체의 버그를 잡는 사후 검증은 이 배열이 아니라 `runValidation` 이
 * 별도 타입으로 반환한다 — 개발자용 진단이 광고주 보고서에 섞이지 않게 한다.
 */
export type PlanWarningKind = "data" | "plan";

/** 코드 → 성격. 엔진이 이 표에서 `kind` 를 채우므로 둘이 어긋날 수 없다. */
export const PLAN_WARNING_KIND: Record<PlanWarningCode, PlanWarningKind> = {
  PERIOD_NO_EXACT_RATE_KEY: "data",
  PERIOD_MISSING_FLIGHT_DATES: "data",
  REGION_UNMAPPED: "data",
  REGION_SUB_UNMAPPED: "data",
  MEDIA_TYPE_UNKNOWN: "data",
  MEDIA_IMPRESSIONS_MISSING: "data",
  MEDIA_PRICE_MISSING: "data",
  IMPRESSIONS_BASIS_CONFLICT: "data",
  REACH_NOT_MODELED: "data",
  BUDGET_OVER: "plan",
  BUDGET_UNDER_UTILIZED: "plan",
};

export type PlanWarning = {
  code: PlanWarningCode;
  /** `PLAN_WARNING_KIND[code]` 와 항상 일치한다 */
  kind: PlanWarningKind;
  severity: "info" | "warn" | "error";
  messageKo: string;
  messageEn: string;
  /** 매체 단위 경고일 때만 */
  mediaId?: string;
  /** 로그·디버그용 부가 값 (표시 문구에 직접 쓰지 말 것) */
  context?: Record<string, string | number | null>;
};

// ---------------------------------------------------------------------------
// 결과
// ---------------------------------------------------------------------------

export type PlanMeta = {
  planId: string | null;
  goal: PlannerCampaignGoal | null;
  industryKey: PlannerIndustryKey | null;
  locale: "ko" | "en";
  mediaCount: number;
  /** ISO 8601. 보고서·PDF 각인용 */
  calculatedAt: string;
  /** 저장된 플랜을 재계산할 때 버전 불일치 감지 */
  engineVersion: string;
};

/**
 * 캠페인 계산 결과 — 화면·PDF·저장 플랜의 단일 소비 객체.
 * 소비처는 이 객체의 필드를 **읽기만** 하고 재계산하지 않는다.
 */
export type PlanResult = {
  meta: PlanMeta;
  period: PlanPeriod;
  money: PlanMoney;
  budgetUsage: PlanBudgetUsage;
  impressions: PlanImpressions;
  cpm: PlanCpm;
  reach: PlanReach;
  breakdown: PlanBreakdown;
  mediaItems: PlanMediaItem[];
  warnings: PlanWarning[];
};
