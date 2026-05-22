/**
 * PRO 체험 만료 처리 — D-3 알림(이메일·알림톡) + 만료 시 FREE 다운그레이드.
 *
 * 인증: Authorization: Bearer ${CRON_SECRET}
 * 스케줄: 0 0 * * * (UTC) = KST 09:00 매일
 */

import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { runProTrialCron } from "@/lib/pro-trial-cron";
import { expireEndedSubscriptions } from "@/lib/subscription-billing";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) return json({ error: "Unauthorized" }, 401);
  const result = await runProTrialCron();
  const subscriptionsExpired = await expireEndedSubscriptions();
  return json({ ok: true, ...result, subscriptionsExpired });
}
