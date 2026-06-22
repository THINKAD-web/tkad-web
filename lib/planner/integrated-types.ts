import type {
  PlannerAgeKey,
  PlannerCampaignGoal,
  PlannerCategory,
  PlannerIndustryKey,
} from "@/lib/planner/types";
import type { DigitalChannelId } from "@/lib/planner/digital-channels";
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";

/** 1~7 입력, 8 결과 대시보드 */
export type IntegratedWizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const INTEGRATED_LAST_INPUT_STEP = 7 as const;
export const INTEGRATED_RESULT_STEP = 8 as const;

export type IntegratedPlannerState = {
  wizardStep: IntegratedWizardStep;
  campaignGoal: PlannerCampaignGoal | null;
  regions: string[];
  categories: PlannerCategory[];
  budget: string;
  months: number;
  ageKeys: PlannerAgeKey[];
  industryKey: PlannerIndustryKey;
  campaignMediaIds: string[];
  /** 선택된 디지털 채널 */
  digitalChannelIds: DigitalChannelId[];
  /** 디지털 예산 비율 (0~100, 나머지는 OOH) */
  digitalBudgetPct: number;
  creativeObjectUrl: string | null;
  creativeUploadedUrl: string | null;
  mediaPlacements: Record<string, CompositeLogoPlacement>;
};
