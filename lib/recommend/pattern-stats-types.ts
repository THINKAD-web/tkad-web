export type PatternStatsSource = "recommend" | "planner";

export type PatternComboDimensions = {
  source: PatternStatsSource;
  industry: string;
  target: string;
  budgetBucket: string;
  goal: string;
};

export type PatternStatsAggregateRow = PatternComboDimensions & {
  comboKey: string;
  count: number;
  topMediaIds: string[];
};

export type RecommendationLogInputJson = {
  industry?: string;
  targets?: string[];
  goal?: string;
  monthlyBudgetWon?: number;
  regions?: string[];
  goalTags?: string[];
  categories?: string[];
  seed?: number;
  _meta?: unknown;
};

export type RecommendationLogItemJson = {
  mediaId?: string;
};
