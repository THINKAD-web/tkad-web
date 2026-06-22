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
  /** 상권 힌트 (매칭·라벨용, store에는 미저장) */
  districtHints: string[];
  categories: PlannerCategory[];
  /** UI 미리보기용 유형 비중 (합 100) */
  categoryMixPct: Record<PlannerCategory, number>;
  budgetMan: number;
  months: number;
  focusPeriodKo: string;
  focusPeriodEn: string;
};

export type PlannerScenarioApplyPatch = Pick<
  PlannerScenario,
  "regions" | "categories" | "budgetMan" | "months"
>;
