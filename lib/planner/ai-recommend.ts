import { z } from "zod";
import type { MediaItem } from "@/lib/media-data";
import { getAnthropicClient, resolveModel } from "@/lib/ai-content-generator";
import {
  recommendPlannerMedia,
  type ScoredMedia,
} from "@/lib/planner/recommend";
import type { RecommendationContext } from "@/lib/planner/recommend";
import {
  buildPlannerAiCatalogPayload,
  type PlannerAiCatalogRow,
} from "@/lib/planner/catalog-for-ai";
import type { PlannerStoreState } from "@/lib/planner/store";
import { selectBudgetNum } from "@/lib/planner/store";
import { purposeToCampaignGoal, type PlannerPurposeKey } from "@/lib/planner/types";

const AiPickSchema = z.object({
  mediaId: z.string(),
  budgetMan: z.number().min(0),
  reasonKo: z.string(),
  reasonEn: z.string(),
});

const AiResponseSchema = z.object({
  summaryKo: z.string(),
  summaryEn: z.string(),
  picks: z.array(AiPickSchema).min(1).max(6),
});

export type PlannerAiRecommendation = {
  source: "anthropic" | "rules";
  summaryKo: string;
  summaryEn: string;
  picks: Array<{
    media: MediaItem;
    budgetMan: number;
    reasonKo: string;
    reasonEn: string;
    score?: number;
  }>;
  totalImpressions: number;
  totalBudgetMan: number;
};

export type PlannerAiBrief = {
  brandName: string;
  purposes: PlannerPurposeKey[];
  industryKey: string;
  ageKey: string;
  genderKey: string;
  interestKeys: string[];
  regions: string[];
  categories: string[];
  budgetMan: number;
  months: number;
  flightStart: string;
  flightEnd: string;
  isKo: boolean;
};


export function plannerBriefFromInput(
  input: Pick<
    PlannerStoreState,
    | "brandName"
    | "campaignPurposes"
    | "industryKey"
    | "ageKey"
    | "genderKey"
    | "interestKeys"
    | "regions"
    | "categories"
    | "budget"
    | "months"
    | "flightStart"
    | "flightEnd"
  >,
  isKo: boolean,
): PlannerAiBrief {
  const pseudo = { ...input, budget: input.budget } as PlannerStoreState;
  return briefFromStore(
    {
      ...pseudo,
      wizardStep: 3,
      campaignGoal:
        input.campaignPurposes.length > 0
          ? purposeToCampaignGoal(input.campaignPurposes[0])
          : null,
      campaignMediaIds: [],
      aiBudgetByMediaId: {},
      aiRecommendSummary: null,
      creativeObjectUrl: null,
      creativeUploadedUrl: null,
      mediaPlacements: {},
    },
    isKo,
  );
}

export function briefFromStore(
  state: PlannerStoreState,
  isKo: boolean,
): PlannerAiBrief {
  return {
    brandName: state.brandName,
    purposes: state.campaignPurposes,
    industryKey: state.industryKey,
    ageKey: state.ageKey,
    genderKey: state.genderKey,
    interestKeys: state.interestKeys,
    regions: state.regions,
    categories: state.categories,
    budgetMan: selectBudgetNum(state),
    months: state.months,
    flightStart: state.flightStart,
    flightEnd: state.flightEnd,
    isKo,
  };
}

function ruleContextFromBrief(brief: PlannerAiBrief): RecommendationContext {
  const goal =
    brief.purposes.length > 0
      ? purposeToCampaignGoal(brief.purposes[0])
      : null;
  return {
    goal,
    regions: brief.regions,
    categories: brief.categories as RecommendationContext["categories"],
    ageKey: brief.ageKey as RecommendationContext["ageKey"],
    industryKey: brief.industryKey as RecommendationContext["industryKey"],
    budgetMan: brief.budgetMan,
    months: brief.months,
  };
}

function allocateBudgets(
  picks: ScoredMedia[],
  totalMan: number,
): Record<string, number> {
  const weights = picks.map((p) => Math.max(0.15, p.score));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = picks.map((p, i) => ({
    id: p.media.id,
    man: Math.round((totalMan * weights[i]) / sum),
  }));
  const allocated = raw.reduce((a, x) => a + x.man, 0);
  const diff = totalMan - allocated;
  if (raw.length > 0 && diff !== 0) {
    raw[0].man = Math.max(0, raw[0].man + diff);
  }
  return Object.fromEntries(raw.map((r) => [r.id, r.man]));
}

export function recommendPlannerWithRules(
  catalog: MediaItem[],
  brief: PlannerAiBrief,
  limit = 5,
): PlannerAiRecommendation {
  const ctx = ruleContextFromBrief(brief);
  const scored = recommendPlannerMedia(catalog, ctx, limit);
  const budgetById = allocateBudgets(scored, brief.budgetMan);
  const picks = scored.map((s) => ({
    media: s.media,
    budgetMan: budgetById[s.media.id] ?? 0,
    reasonKo: s.reasons
      .slice(0, 2)
      .map((r) => r.key)
      .join(", "),
    reasonEn: s.reasons
      .slice(0, 2)
      .map((r) => r.key)
      .join(", "),
    score: s.score,
  }));
  const totalImpressions = picks.reduce(
    (sum, p) =>
      sum +
      (p.media.impressions ??
        p.media.monthlyFootTraffic ??
        (p.media.dailyFootTraffic > 0
          ? Math.round(p.media.dailyFootTraffic * 30)
          : 0)),
    0,
  );
  return {
    source: "rules",
    summaryKo: `${brief.brandName} 캠페인에 맞춰 CPM·지역·업종 가중치로 선별한 매체 믹스입니다.`,
    summaryEn: `Media mix selected for ${brief.brandName} using CPM, region, and industry-weighted scoring.`,
    picks,
    totalImpressions,
    totalBudgetMan: brief.budgetMan,
  };
}

function buildSystemPrompt(catalog: PlannerAiCatalogRow[]): string {
  return `You are THINKAD (싱커드) OOH media planner. Recommend 3–5 media from the JSON catalog ONLY.
Rules:
- Use only media ids present in the catalog JSON.
- Total budgetMan across picks must not exceed the user's budgetMan.
- Optimize for CPM efficiency (impressions per won), regional coverage, and industry fit.
- Prefer verified media when scores are similar.
- Output valid JSON only via the recommend_plan tool.`;
}

function buildUserPrompt(
  brief: PlannerAiBrief,
  catalog: PlannerAiCatalogRow[],
): string {
  return JSON.stringify({
    brief,
    catalog,
    instructions:
      "Return 3-5 picks with budgetMan split, reasonKo, reasonEn per pick, and summaryKo/summaryEn.",
  });
}

const recommendTool = {
  name: "recommend_plan",
  description: "OOH media mix recommendation",
  input_schema: {
    type: "object" as const,
    properties: {
      summaryKo: { type: "string" },
      summaryEn: { type: "string" },
      picks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            mediaId: { type: "string" },
            budgetMan: { type: "number" },
            reasonKo: { type: "string" },
            reasonEn: { type: "string" },
          },
          required: ["mediaId", "budgetMan", "reasonKo", "reasonEn"],
        },
      },
    },
    required: ["summaryKo", "summaryEn", "picks"],
  },
};

export async function recommendPlannerWithAi(
  catalog: MediaItem[],
  brief: PlannerAiBrief,
): Promise<PlannerAiRecommendation> {
  const filtered = catalog.filter((m) => {
    if (brief.regions.length === 0) return true;
    return brief.regions.includes(m.region);
  });
  const payload = buildPlannerAiCatalogPayload(
    filtered.length > 0 ? filtered : catalog,
  );
  if (payload.length === 0) {
    return recommendPlannerWithRules(catalog, brief);
  }

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: resolveModel(),
      max_tokens: 2048,
      system: buildSystemPrompt(payload),
      tools: [recommendTool],
      tool_choice: { type: "tool", name: "recommend_plan" },
      messages: [
        {
          role: "user",
          content: buildUserPrompt(brief, payload),
        },
      ],
    });

    let raw: unknown;
    for (const block of message.content) {
      if (block.type === "tool_use" && block.name === "recommend_plan") {
        raw = block.input;
        break;
      }
    }
    if (!raw) throw new Error("No tool output");

    const parsed = AiResponseSchema.parse(raw);
    const byId = new Map(catalog.map((m) => [m.id, m]));
    const picks = parsed.picks
      .map((p) => {
        const media = byId.get(p.mediaId);
        if (!media) return null;
        return {
          media,
          budgetMan: p.budgetMan,
          reasonKo: p.reasonKo,
          reasonEn: p.reasonEn,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .slice(0, 5);

    if (picks.length === 0) throw new Error("No valid picks");

    const totalBudgetMan = picks.reduce((s, p) => s + p.budgetMan, 0);
    const totalImpressions = picks.reduce(
      (sum, p) =>
        sum +
        (p.media.impressions ??
          p.media.monthlyFootTraffic ??
          (p.media.dailyFootTraffic > 0
            ? Math.round(p.media.dailyFootTraffic * 30)
            : 0)),
      0,
    );

    return {
      source: "anthropic",
      summaryKo: parsed.summaryKo,
      summaryEn: parsed.summaryEn,
      picks,
      totalImpressions,
      totalBudgetMan,
    };
  } catch {
    return recommendPlannerWithRules(catalog, brief);
  }
}
