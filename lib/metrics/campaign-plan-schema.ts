/**
 * `CampaignPlan` 저장 형태 — 런타임 검증용 타입.
 *
 * `engineVersion` 을 함께 저장한다. 계산식이 바뀌면 `metrics` 재계산이
 * 필요할 때 원 버전 대비 차이를 명시할 수 있다 (진단서 §4).
 * 이 모듈은 스토리지 계층이 아니고 형식 계약만 정의한다. 실제 CRUD 는
 * PR-4 이후 별도 스토어 (`lib/campaign-plan-store.ts`) 가 담당한다.
 */
import { METRICS_ENGINE_VERSION } from "./constants";
import type { AgeBand, Gender, ReachResult } from "./types";

export type CampaignPlanBrief = {
  budgetWon: number;
  /** 시도 코드(2자리) 배열 */
  regionCodes: string[];
  genders?: Gender[];
  ageBands?: AgeBand[];
  goal?: string;
  industry?: string;
  flightStart: string;
  flightEnd: string;
  freeText?: string;
};

export type CampaignPlanMediaLine = {
  mediaId: string;
  slug?: string | null;
  name: string;
  units: number;
  days: number;
  optionId?: string;
  priceWon: number;
  priceIsEstimate: boolean;
  impressions: number;
  cpmWon: number | null;
};

export type CampaignPlanMetrics = ReachResult & {
  mixCpmWon: number | null;
  totalCostWon: number;
};

export type CampaignPlanSnapshot = {
  brief: CampaignPlanBrief;
  mediaMix: CampaignPlanMediaLine[];
  metrics: CampaignPlanMetrics;
  engineVersion: string;
};

/** 기본 30일 TTL — DB `expires_at` 에 저장 */
export const CAMPAIGN_PLAN_TTL_DAYS = 30;

export function defaultExpiresAt(now: Date = new Date()): Date {
  const out = new Date(now);
  out.setDate(out.getDate() + CAMPAIGN_PLAN_TTL_DAYS);
  return out;
}

/** 저장 직전 스냅샷 — 현재 엔진 버전을 자동으로 기록한다 */
export function snapshotWithEngineVersion(
  input: Omit<CampaignPlanSnapshot, "engineVersion">,
): CampaignPlanSnapshot {
  return { ...input, engineVersion: METRICS_ENGINE_VERSION };
}

/**
 * 저장된 스냅샷이 현재 엔진과 같은 버전인지.
 * 다르면 UI 가 "이 제안서는 이전 계산 로직 기준입니다" 배지를 붙인다.
 */
export function isEngineVersionCurrent(snapshot: CampaignPlanSnapshot): boolean {
  return snapshot.engineVersion === METRICS_ENGINE_VERSION;
}
