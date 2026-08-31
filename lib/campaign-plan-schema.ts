/**
 * `CampaignPlan` 저장 형태 — 런타임 검증용 타입 계약.
 *
 * `engineVersion` 을 함께 저장한다. 계산식이 바뀌면 `metrics` 재계산이
 * 필요할 때 원 버전 대비 차이를 명시할 수 있다 (진단서 §4).
 * 이 모듈은 스토리지 계층이 아니고 형식 계약만 정의한다. 실제 CRUD 는
 * 별도 스토어 (`lib/campaign-plan-store.ts`) 가 담당한다.
 *
 * 3계층 계약(docs/media-data-contract.md) 및 PR-3 재설계
 * (docs/pr3-redesign.md) 와 **무관**하다. 이 파일은 저장된 플랜 스냅샷
 * 하나의 형태를 정의할 뿐, 매체 데이터 계층을 참조하지 않는다.
 */

import type { CampaignPlanMixEntry } from "@/lib/campaign-plan-mix-entry";
import { METRICS_ENGINE_VERSION } from "@/lib/metrics/constants";
import type { MetricBasis } from "@/lib/metrics/defaults";
import type { PlannerReportCopyState } from "@/lib/planner-report-export/report-copy-state";

export type {
  CampaignPlanCatalogMixEntry,
  CampaignPlanCustomMixEntry,
  CampaignPlanMixEntry,
} from "@/lib/campaign-plan-mix-entry";
export {
  filterCatalogMixEntries,
  filterCustomMixEntries,
  isCatalogMixEntry,
  isCustomMixEntry,
  normalizeMediaMix,
  normalizeMixEntry,
  sumCustomMixTotalWon,
} from "@/lib/campaign-plan-mix-entry";

/** 계산 엔진 버전 — `CampaignPlan.engineVersion` 스냅샷에 기록 */
export const CAMPAIGN_PLAN_ENGINE_VERSION = METRICS_ENGINE_VERSION;

/** 기본 30일 TTL — DB `expires_at` 에 저장 */
export const CAMPAIGN_PLAN_TTL_DAYS = 30;

export type CampaignPlanGender = "male" | "female";
export type CampaignPlanAgeBand = "10s" | "20s" | "30s" | "40s" | "50s+";

export type CampaignPlanBrief = {
  budgetWon: number;
  /** 시도 코드(2자리) 배열 */
  regionCodes: string[];
  genders?: CampaignPlanGender[];
  ageBands?: CampaignPlanAgeBand[];
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

export type CampaignPlanMetrics = {
  /** 순 도달 인원 */
  netReach: number;
  /** 타깃 모집단 */
  targetPopulation: number;
  /** 도달률 (0~1) */
  reachRate: number;
  /** 평균 접촉 빈도 */
  frequency: number;
  /** GRP */
  grp: number;
  /** 3회 이상 접촉 인원 */
  effectiveReach: number;
  effectiveReachRate: number;
  /** 총 노출 */
  totalImpressions: number;
  /** 혼합 CPM (원) */
  mixCpmWon: number | null;
  /** 총액 (원) */
  totalCostWon: number;
  /** 총액 − 요청 예산 (초과 없으면 0) — calcMixMetrics.overBudgetWon */
  overBudgetWon: number;
  /** 총액 / 요청 예산 (0~1+, 초과 시 1 초과) — calcMixMetrics.budgetUsedRate */
  budgetUsedRate: number;
};

/** 구 스냅샷에 overBudgetWon 이 없을 때 totalCost − budget 으로 복원 */
export function resolveStoredOverBudget(
  metrics: Pick<CampaignPlanMetrics, "totalCostWon"> &
    Partial<Pick<CampaignPlanMetrics, "overBudgetWon" | "budgetUsedRate">>,
  budgetWon: number,
): { overBudgetWon: number; budgetUsedRate: number } {
  const mixWon = metrics.totalCostWon;
  const request = Math.max(0, budgetWon);
  const overBudgetWon =
    typeof metrics.overBudgetWon === "number" &&
    Number.isFinite(metrics.overBudgetWon)
      ? Math.max(0, metrics.overBudgetWon)
      : Math.max(0, mixWon - request);
  const budgetUsedRate =
    typeof metrics.budgetUsedRate === "number" &&
    Number.isFinite(metrics.budgetUsedRate)
      ? metrics.budgetUsedRate
      : request > 0
        ? mixWon / request
        : 0;
  return { overBudgetWon, budgetUsedRate };
}

/** 저장 시 각 지표의 basis — 재계산·감사 추적용 (PR-6c) */
export type CampaignPlanDataQuality = {
  totalCostWon: MetricBasis;
  totalImpressions: MetricBasis;
  mixCpmWon: MetricBasis | null;
  netReach: null;
  reachRate: null;
  frequency: null;
  grp: null;
};

export type CampaignPlanStoredMetrics = CampaignPlanMetrics & {
  dataQuality: CampaignPlanDataQuality;
};

export type CampaignPlanSnapshot = {
  brief: CampaignPlanBrief;
  /** catalog + custom 혼합. `kind` 없는 row = legacy catalog */
  mediaMix: CampaignPlanMixEntry[];
  metrics: CampaignPlanStoredMetrics;
  engineVersion: string;
  /** 저장 시 `brief` Json 안에 함께 persist (별도 DB 컬럼 없음) */
  reportCopy?: PlannerReportCopyState | null;
};

export function defaultExpiresAt(now: Date = new Date()): Date {
  const out = new Date(now);
  out.setDate(out.getDate() + CAMPAIGN_PLAN_TTL_DAYS);
  return out;
}

/** 저장 직전 스냅샷 — 현재 엔진 버전을 자동으로 기록한다 */
export function snapshotWithEngineVersion(
  input: Omit<CampaignPlanSnapshot, "engineVersion">,
): CampaignPlanSnapshot {
  return { ...input, engineVersion: CAMPAIGN_PLAN_ENGINE_VERSION };
}

/**
 * 저장된 스냅샷이 현재 엔진과 같은 버전인지.
 * 다르면 UI 가 "이 제안서는 이전 계산 로직 기준입니다" 배지를 붙인다.
 */
export function isEngineVersionCurrent(
  snapshot: Pick<CampaignPlanSnapshot, "engineVersion">,
): boolean {
  return snapshot.engineVersion === CAMPAIGN_PLAN_ENGINE_VERSION;
}
