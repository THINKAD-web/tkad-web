/**
 * recommendation_logs → RecommendationPatternStats weekly full recompute.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}
 * Schedule (STEP3d): 0 18 * * 0 UTC = Mon 03:00 KST (before log cleanup)
 */

import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { isDatabaseConfigured } from "@/lib/prisma";
import { runRecommendationPatternStatsAggregate } from "@/lib/recommend/pattern-stats-aggregate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!isDatabaseConfigured()) {
    return json({ ok: false, reason: "no_database" }, 200);
  }

  try {
    const result = await runRecommendationPatternStatsAggregate();
    return json(result);
  } catch (e) {
    console.error("[cron/recommendation-pattern-stats]", e);
    return json({ ok: false, error: "cron_failed" }, 500);
  }
}
