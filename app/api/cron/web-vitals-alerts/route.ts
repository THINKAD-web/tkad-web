/**
 * Core Web Vitals p75 임계값 초과 시 Slack 알림.
 * 스케줄: Vercel Cron `30 2 * * *` (UTC, 일 1회)
 */

import type { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { notifyWebVitalsThresholdSlack } from "@/lib/web-vitals-slack-alert";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const h = request.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const result = await notifyWebVitalsThresholdSlack(7);
    return json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/web-vitals-alerts]", e);
    return json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "alert_failed",
      },
      500,
    );
  }
}
