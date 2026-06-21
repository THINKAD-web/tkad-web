import type {
  PlannerAgeKey,
  PlannerCampaignGoal,
  PlannerCategory,
  PlannerIndustryKey,
} from "@/lib/planner/types";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";

/** 플래너·통합 플래너 추천·자동 포트폴리오 공통 컨텍스트 */
export type RecommendationContext = {
  goal: PlannerCampaignGoal | null;
  regions: string[];
  /** 서울 하위 상권 — 빈 배열이면 서울 전체 */
  seoulZones?: readonly PlannerSeoulZoneKey[];
  categories: PlannerCategory[];
  ageKey: PlannerAgeKey;
  industryKey: PlannerIndustryKey | null;
  /** 만원 단위 예산 */
  budgetMan: number;
  months: number;
  goalFollowUp?: PlannerGoalFollowUp;
};
