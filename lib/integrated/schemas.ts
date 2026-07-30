import { z } from "zod";
import {
  PLANNER_INDUSTRY_KEYS,
  PLANNER_AGE_KEYS,
} from "@/lib/planner/types";

/** POST /api/integrated/mix request (§11 design v1). */
export const integratedMixRequestSchema = z.object({
  channelType: z.literal("integrated"),
  goal: z.enum(["brand", "launch", "event", "sales", "local"]),
  industry: z.enum(PLANNER_INDUSTRY_KEYS),
  regions: z.array(z.string().min(1)).min(1),
  ageKeys: z.array(z.enum(PLANNER_AGE_KEYS)).optional(),
  target: z
    .object({
      gender: z.enum(["ALL", "M", "F"]).optional(),
    })
    .optional(),
  budgetTotalWon: z.number().int().min(5_000_000).max(5_000_000_000),
  periodMonths: z.number().int().min(1).max(12),
  digitalBudgetPct: z.number().min(0).max(100).optional(),
  selectedOohMediaIds: z.array(z.string()).optional(),
  selectedDigitalSlugs: z.array(z.string()).optional(),
  locale: z.enum(["ko", "en"]).optional(),
});

export type IntegratedMixRequest = z.infer<typeof integratedMixRequestSchema>;

export type IntegratedMixResponse = {
  meta: {
    channelType: "integrated";
    generatedAt: string;
    version: "v1";
    oohCatalogSize: number;
    digitalCatalogSize: number;
    allocationPolicy: "user_override" | "goal_default_v1";
  };
  allocation: {
    oohBudgetWon: number;
    digitalBudgetWon: number;
    oohBudgetPct: number;
    digitalBudgetPct: number;
  };
  ooh: {
    recommended: Array<{
      mediaId: string;
      name: string;
      region: string;
      budgetWon: number;
      budgetPct: number;
      score: number;
      rationaleKo: string;
      rationaleEn: string;
    }>;
    metrics: {
      impressions: number;
      reach: number;
      cpmKrw: number | null;
    };
  };
  digital: {
    mix: DigitalMixResult;
  };
  integrated: {
    synergyLiftMultiplier: number;
    combinedKpis: {
      totalImpressionsMin: number | null;
      totalImpressionsMax: number | null;
      totalClicksMin: number | null;
      totalClicksMax: number | null;
    };
    disclaimers: {
      ko: string;
      en: string;
    };
  };
  handoff: {
    contactUrl: string;
    plannerUrl: string;
  };
};

/** Subset of dmpilot MixResult embedded in BFF response. */
export type DigitalMixResult = {
  input: {
    industry: string;
    goal: string;
    budgetMonthly: number;
    periodWeeks: number;
  };
  generatedAt: string;
  channels: Array<{
    media: { slug: string; nameKo: string; nameEn: string };
    budgetWon: number;
    budgetPct: number;
    reason: string;
  }>;
  kpis: {
    impressionsMin: number | null;
    impressionsMax: number | null;
    clicksMin: number | null;
    clicksMax: number | null;
  };
};

export type DigitalMixGenerateResponse = {
  result: DigitalMixResult & {
    usedFallback?: boolean;
    donutSegments?: unknown[];
  };
  meta?: { channelType?: string | null };
};
