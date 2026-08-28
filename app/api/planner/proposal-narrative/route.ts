import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import { plannerContextToMatching } from "@/lib/recommendation-adapters";
import { generatePlannerProposalNarrative } from "@/lib/recommendation-claude";
import { isPlannerClaudeEnabled } from "@/lib/planner/planner-claude-config";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { getCurrentUser } from "@/lib/user-session";
import { enforceAiRateLimit, aiRateMessage } from "@/lib/ai-rate-limit";
import {
  PLANNER_AGE_KEYS,
  PLANNER_INDUSTRY_KEYS,
} from "@/lib/planner/types";
import type { PlannerCampaignGoal, PlannerCategory } from "@/lib/planner/types";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 30, windowMs: 60_000 });

const Body = z.object({
  goal: z
    .enum(["brand", "launch", "event", "sales", "local"])
    .nullable()
    .optional(),
  regions: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  ageKey: z.enum(PLANNER_AGE_KEYS).default("ageAll"),
  industryKey: z.enum(PLANNER_INDUSTRY_KEYS).nullable().optional(),
  budgetMan: z.number().min(0).max(1_000_000),
  months: z.number().int().min(1).max(36),
  mediaIds: z.array(z.string()).min(1).max(20),
  locale: z.string().max(8).optional(),
});

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store, private" },
  });
}

export async function POST(request: NextRequest) {
  const claudeUsed = isPlannerClaudeEnabled();
  if (!claudeUsed) {
    return json({ ok: true, claudeUsed: false, sentences: null });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!limiter.check(ip)) {
    return json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const aiUser = await getCurrentUser();
  const aiRl = await enforceAiRateLimit(request, aiUser?.id ?? null);
  if (!aiRl.allowed) {
    return json(
      {
        ok: false,
        rateLimited: true,
        reason: aiRl.reason,
        message: aiRateMessage(aiRl.reason, true),
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
  const ctx = {
    goal: (d.goal ?? null) as PlannerCampaignGoal | null,
    regions: d.regions,
    categories: d.categories as PlannerCategory[],
    ageKey: d.ageKey,
    industryKey: d.industryKey ?? null,
    budgetMan: d.budgetMan,
    months: d.months,
  };

  let userId: string | null = null;
  try {
    const user = await getCurrentUser();
    userId = user?.id ?? null;
  } catch {
    /* public */
  }

  try {
    const catalog = await fetchPublicMediaCatalogList();
    const byId = new Map(catalog.map((m) => [m.id, m]));
    const portfolio = d.mediaIds
      .map((id) => byId.get(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .map((m) => ({
        mediaId: m.id,
        name: m.name,
        type: m.type,
        monthlyPriceWon: catalogPriceFieldToWon(m.price),
      }));

    if (portfolio.length === 0) {
      return json({ ok: true, claudeUsed: true, sentences: null });
    }

    const matchingInput = plannerContextToMatching(ctx, 0);
    const sentences = await generatePlannerProposalNarrative(
      matchingInput,
      portfolio,
      isKo,
      { source: "planner", userId, cached: false },
    );

    return json({
      ok: true,
      claudeUsed: true,
      sentences,
    });
  } catch (e) {
    console.error("[api/planner/proposal-narrative]", e);
    return json({ ok: true, claudeUsed: true, sentences: null });
  }
}
