import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { sendHourlyLaunchSlackReport } from "@/lib/monitoring/slack-hourly-launch";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** 매시간 — 오픈 모니터 Slack 리포트 */
export async function GET(request: NextRequest) {
  if (!authOk(request)) return json({ error: "Unauthorized" }, 401);
  const slack = await sendHourlyLaunchSlackReport();
  return json({ ok: true, slack });
}
