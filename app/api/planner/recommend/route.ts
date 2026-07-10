import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { runRecommendation } from "@/lib/recommendation-service";
import {
  matchedToApiItems,
  plannerContextToMatching,
} from "@/lib/recommendation-adapters";
import { getCurrentUser } from "@/lib/user-session";
import { enforceAiRateLimit, aiRateMessage } from "@/lib/ai-rate-limit";
import {
  normalizePlannerAgeKeys,
  PLANNER_AGE_KEYS,
  PLANNER_INDUSTRY_KEYS,
} from "@/lib/planner/types";
import { PLANNER_SEOUL_ZONE_KEYS } from "@/lib/planner/seoul-zones";
import { PLANNER_BUSAN_ZONE_KEYS } from "@/lib/planner/busan-zones";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import { isPlannerClaudeEnabled } from "@/lib/planner/planner-claude-config";
import type { PlannerCampaignGoal, PlannerCategory } from "@/lib/planner/types";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 60, windowMs: 60_000 });

const Body = z.object({
  goal: z
    .enum(["brand", "launch", "event", "sales", "local"])
    .nullable()
    .optional(),
  regions: z.array(z.string()).default([]),
  seoulZones: z.array(z.enum(PLANNER_SEOUL_ZONE_KEYS)).optional(),
  busanZones: z.array(z.enum(PLANNER_BUSAN_ZONE_KEYS)).optional(),
  categories: z.array(z.string()).default([]),
  ageKey: z.enum(PLANNER_AGE_KEYS).optional(),
  ageKeys: z.array(z.enum(PLANNER_AGE_KEYS)).optional(),
  industryKey: z.enum(PLANNER_INDUSTRY_KEYS).nullable().optional(),
  goalFollowUp: z
    .object({
      launchFocusWeeks: z.number().nullable().optional(),
      launchTiming: z.enum(["asap", "next_month", "season"]).nullable().optional(),
      localRadiusKm: z.number().nullable().optional(),
      localTradeArea: z.string().nullable().optional(),
      eventDurationDays: z.number().nullable().optional(),
      conversionChannel: z.enum(["store", "online", "both"]).nullable().optional(),
      conversionKpi: z.string().nullable().optional(),
    })
    .optional(),
  budgetMan: z.number().min(0).max(1_000_000),
  months: z.number().int().min(1).max(36),
  seed: z.number().int().min(0).max(9999).optional(),
  limit: z.number().int().min(1).max(15).optional(),
  sessionId: z.string().max(64).optional(),
  locale: z.string().max(8).optional(),
  useClaude: z.boolean().optional(),
});

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store, private" },
  });
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!limiter.check(ip)) {
    return json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  // 일일 AI 한도 (비로그인 1 / 로그인 5 / PRO 30) + 어뷰징 방지
  const aiUser = await getCurrentUser();
  const aiRl = await enforceAiRateLimit(request, aiUser?.id ?? null);
  if (!aiRl.allowed) {
    return json(
      {
        ok: false,
        rateLimited: true,
        reason: aiRl.reason,
        message: aiRateMessage(aiRl.reason, true),
        remaining: 0,
        limit: aiRl.limit,
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const d = parsed.data;
  const isKo = (d.locale ?? "ko").startsWith("ko");
  const ageKeys = normalizePlannerAgeKeys(d.ageKeys ?? d.ageKey ?? []);
  const ctx = {
    goal: (d.goal ?? null) as PlannerCampaignGoal | null,
    regions: d.regions,
    seoulZones: d.seoulZones,
    busanZones: d.busanZones,
    categories: d.categories as PlannerCategory[],
    ageKeys,
    industryKey: d.industryKey ?? null,
    budgetMan: d.budgetMan,
    months: d.months,
    goalFollowUp: (d.goalFollowUp ?? {}) as PlannerGoalFollowUp,
  };

  const matchingInput = plannerContextToMatching(ctx, d.seed ?? 0);

  let userId: string | null = null;
  try {
    const user = await getCurrentUser();
    userId = user?.id ?? null;
  } catch {
    /* public */
  }

  try {
    const { recommendations, cached, logId, claudeUsed } = await runRecommendation({
      input: matchingInput,
      source: "planner",
      limit: d.limit ?? 5,
      useClaude: d.useClaude ?? isPlannerClaudeEnabled(),
      isKo,
      userId,
      sessionId: d.sessionId ?? null,
      plannerRegionIds: d.regions.length > 0 ? d.regions : undefined,
    });

    const industry =
      d.industryKey ?
        d.industryKey.replace(/^ind/, "").toLowerCase()
      : "other";
    const items = matchedToApiItems(
      recommendations,
      industry,
      [matchingInput.targets[0] ?? "mass"],
      isKo,
    );

    return json({
      ok: true,
      cached,
      logId,
      claudeUsed,
      items,
    });
  } catch (e) {
    console.error("[api/planner/recommend]", e);
    return json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
