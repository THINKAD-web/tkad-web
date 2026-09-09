/**
 * recommendation_logs TTL hard delete — runs after weekly pattern-stats aggregate.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}
 * Schedule (STEP3d): 0 19 * * 0 UTC = Mon 04:00 KST
 *
 * Dry-run: default true via RECOMMENDATION_LOG_CLEANUP_DRY_RUN, or ?dryRun=1
 * Live delete requires recent successful aggregate (OpsAutomationState gate).
 */

import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { isDatabaseConfigured } from "@/lib/prisma";
import { resolveCleanupDryRun } from "@/lib/recommend/pattern-stats-config";
import { runRecommendationLogCleanup } from "@/lib/recommend/recommendation-log-cleanup";

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

  const dryRun = resolveCleanupDryRun(request.nextUrl.searchParams.get("dryRun"));

  try {
    const result = await runRecommendationLogCleanup({ dryRun });
    return json(result);
  } catch (e) {
    console.error("[cron/recommendation-logs-cleanup]", e);
    return json({ ok: false, error: "cron_failed" }, 500);
  }
}
