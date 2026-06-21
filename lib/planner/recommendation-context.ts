import type {
  PlannerAgeKey,
  PlannerCampaignGoal,
  PlannerCategory,
  PlannerIndustryKey,
} from "@/lib/planner/types";

/** 플래너·통합 플래너 추천·자동 포트폴리오 공통 컨텍스트 */
export type RecommendationContext = {
  goal: PlannerCampaignGoal | null;
  regions: string[];
  categories: PlannerCategory[];
  ageKey: PlannerAgeKey;
  industryKey: PlannerIndustryKey | null;
  /** 만원 단위 예산 */
  budgetMan: number;
  months: number;
};
