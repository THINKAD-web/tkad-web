import { z } from "zod";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import {
  plannerBriefFromInput,
  recommendPlannerWithAi,
} from "@/lib/planner/ai-recommend";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import {
  PLANNER_AGE_KEYS,
  PLANNER_GENDER_KEYS,
  PLANNER_INDUSTRY_KEYS,
  PLANNER_INTEREST_KEYS,
  PLANNER_PURPOSE_KEYS,
  isPlannerCategory,
} from "@/lib/planner/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BodySchema = z.object({
  locale: z.enum(["ko", "en"]).optional().default("ko"),
  brandName: z.string().max(120),
  campaignPurposes: z.array(z.enum(PLANNER_PURPOSE_KEYS)).min(1).max(4),
  industryKey: z.enum(PLANNER_INDUSTRY_KEYS),
  ageKey: z.enum(PLANNER_AGE_KEYS),
  genderKey: z.enum(PLANNER_GENDER_KEYS),
  interestKeys: z.array(z.enum(PLANNER_INTEREST_KEYS)).max(6),
  regions: z.array(z.string()).min(1),
  categories: z
    .array(z.string())
    .refine((arr) => arr.every((c) => isPlannerCategory(c)), {
      message: "Invalid category",
    }),
  budget: z.string(),
  months: z.number().min(0.25).max(24),
  flightStart: z.string().optional().default(""),
  flightEnd: z.string().optional().default(""),
});

export async function POST(req: Request) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return apiError("INVALID_JSON", 400);
    }

    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", 400, {
        issues: parsed.error.issues,
      });
    }

    const catalog = await fetchPublicMediaCatalog();
    if (catalog.length === 0) {
      return apiError("CATALOG_EMPTY", 503, {
        message: "No media in catalog",
      });
    }

    const d = parsed.data;
    const brief = plannerBriefFromInput(
      {
        brandName: d.brandName,
        campaignPurposes: d.campaignPurposes,
        regions: d.regions,
        categories: d.categories as never,
        budget: d.budget,
        months: d.months,
        ageKey: d.ageKey,
        genderKey: d.genderKey,
        interestKeys: d.interestKeys,
        industryKey: d.industryKey,
        flightStart: d.flightStart,
        flightEnd: d.flightEnd,
      },
      d.locale === "ko",
    );

    const result = await recommendPlannerWithAi(catalog, brief);

    return apiOk({
      source: result.source,
      summary: d.locale === "ko" ? result.summaryKo : result.summaryEn,
      summaryKo: result.summaryKo,
      summaryEn: result.summaryEn,
      totalImpressions: result.totalImpressions,
      totalBudgetMan: result.totalBudgetMan,
      picks: result.picks.map((p) => ({
        mediaId: p.media.id,
        name: p.media.name,
        nameEn: p.media.nameEn,
        region: p.media.region,
        type: p.media.type,
        location: p.media.location,
        image: p.media.sampleImages?.[0] ?? null,
        budgetMan: p.budgetMan,
        reason: d.locale === "ko" ? p.reasonKo : p.reasonEn,
        reasonKo: p.reasonKo,
        reasonEn: p.reasonEn,
        monthlyImpressions:
          p.media.impressions ??
          p.media.monthlyFootTraffic ??
          (p.media.dailyFootTraffic > 0
            ? Math.round(p.media.dailyFootTraffic * 30)
            : 0),
      })),
    });
  } catch (e) {
    return apiServerError(e, "planner/recommend");
  }
}
