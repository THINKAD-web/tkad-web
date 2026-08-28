import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { fetchPublicMediaFilterCounts } from "@/lib/public-media-filter-counts";
import { getCachedDailyEngagementScoreRecord } from "@/lib/media-popularity-daily-cache";
import { fetchTrustBadgeContext } from "@/lib/media-trust-catalog";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Hourly warm of browse caches — avoids cold popular-sort groupBy on user traffic.
 * Schedule: 15 * * * * (UTC), offset from daily popularity cron.
 */
export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!isDatabaseConfigured()) {
    return json({ ok: false, reason: "no_database" }, 200);
  }

  try {
    const [catalog, engagement, trust, filterCounts] = await Promise.all([
      fetchPublicMediaCatalog(),
      getCachedDailyEngagementScoreRecord(),
      fetchTrustBadgeContext(),
      fetchPublicMediaFilterCounts(),
    ]);
    return json({
      ok: true,
      warmed: {
        catalogItems: catalog.length,
        engagementKeys: Object.keys(engagement).length,
        trustTopInquiry: trust.topInquiryIds.size,
        filterCountKeys:
          Object.keys(filterCounts.subCategory).length +
          Object.keys(filterCounts.regionSub).length,
      },
    });
  } catch (e) {
    console.error("[cron/warm-media-browse-cache]", e);
    return json(
      { ok: false, error: e instanceof Error ? e.message : "warm_failed" },
      500,
    );
  }
}
