import type { PublicMediaView } from "@/lib/digital/public-media-types";

export type CampaignGoal =
  | "AWARENESS"
  | "TRAFFIC"
  | "CONVERSION"
  | "APP_INSTALL"
  | "VISIT"
  | "LEAD";

export type Industry =
  | "ECOMMERCE"
  | "BEAUTY"
  | "FNB"
  | "APP"
  | "EDU"
  | "MEDICAL"
  | "REALESTATE"
  | "B2B"
  | "LOCAL"
  | "ENTER";

export type MixTarget = {
  age: string;
  gender: string;
  geo: string;
};

export type MixInput = {
  industry: Industry;
  goal: CampaignGoal;
  target: MixTarget;
  budgetMonthly: number;
  periodWeeks: number;
};

export type MixChannelPerformance = {
  impressionsMin: number | null;
  impressionsMax: number | null;
  clicksMin: number | null;
  clicksMax: number | null;
  pricingLabel: string;
};

export type MixChannelAllocation = {
  media: PublicMediaView;
  budgetWon: number;
  budgetPct: number;
  funnelStage: "awareness" | "consideration" | "conversion";
  reason: string;
  performance: MixChannelPerformance;
};

export type MixAggregateKpi = {
  impressionsMin: number | null;
  impressionsMax: number | null;
  clicksMin: number | null;
  clicksMax: number | null;
  visitsMin: number | null;
  visitsMax: number | null;
  reachLabel: "문의";
};

export type MixResult = {
  input: MixInput;
  generatedAt: string;
  usedFallback: boolean;
  fallbackGoals: CampaignGoal[];
  requestedGoal: CampaignGoal;
  effectiveGoals: CampaignGoal[];
  channels: MixChannelAllocation[];
  kpis: MixAggregateKpi;
  donutSegments: {
    slug: string;
    nameKo: string;
    budgetWon: number;
    colorIndex: number;
  }[];
};

export const MIX_ENGINE_MIN_CHANNELS = 3;
export const MIX_ENGINE_MAX_CHANNELS = 6;
