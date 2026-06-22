import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import type {
  PlannerAgeKey,
  PlannerCampaignGoal,
  PlannerCategory,
  PlannerIndustryKey,
} from "@/lib/planner/types";

/** 시나리오 변주 축 — 예산·매체 믹스 성향 */
export type ScenarioVariant = "efficiency" | "balanced" | "premium";

export const SCENARIO_VARIANTS: ScenarioVariant[] = [
  "efficiency",
  "balanced",
  "premium",
];

/** 동적 생성 입력 (Step 1~2 확정값) */
export type ScenarioInput = {
  goal: PlannerCampaignGoal | null;
  industryKey: PlannerIndustryKey;
  regions: string[];
  ageKeys: PlannerAgeKey[];
  locale?: string;
};

/** 규칙 기반으로 조립된 시나리오 1안 */
export type PlannerScenario = {
  id: string;
  variant: ScenarioVariant;
  labelKo: string;
  labelEn: string;
  descriptionKo: string;
  descriptionEn: string;
  regions: string[];
  /** 상권 힌트 (매칭·라벨용) */
  districtHints: string[];
  categories: PlannerCategory[];
  /** UI 미리보기용 유형 비중 (합 100) */
  categoryMixPct: Record<PlannerCategory, number>;
  budgetMan: number;
  months: number;
  focusPeriodKo: string;
  focusPeriodEn: string;
};

/** 시나리오 적용 시 store·자동조합에 필요한 입력 전체 */
export type PlannerScenarioApplyPatch = {
  regions: string[];
  categories: PlannerCategory[];
  budgetMan: number;
  months: number;
  districtHints?: string[];
  seoulZones?: PlannerSeoulZoneKey[];
  campaignGoal?: PlannerCampaignGoal | null;
  industryKey?: PlannerIndustryKey;
  ageKeys?: PlannerAgeKey[];
  goalFollowUp?: PlannerGoalFollowUp;
  /** 자동조합 결과. UI에서 resolve 후 주입 */
  campaignMediaIds?: string[];
};
