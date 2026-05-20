import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { sendDailyOpsSlackReport } from "@/lib/monitoring/slack-daily-report";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const h = request.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

/** 매일 09:00 KST (00:00 UTC) — 전날 운영 지표 Slack 발송 */
export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const result = await sendDailyOpsSlackReport();
  return json({ ok: true, slack: result });
}
