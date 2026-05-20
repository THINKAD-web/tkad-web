import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { buildMarketInsightsWeeklyEmails } from "@/lib/email/market-insights-weekly";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** 매주 월요일 — PRO 구독자 시장 인사이트 이메일 */
export async function GET(request: NextRequest) {
  if (!authOk(request)) return json({ error: "Unauthorized" }, 401);
  if (!isDatabaseConfigured() || !isEmailConfigured()) {
    return json({ ok: false, reason: "not_configured" }, 200);
  }

  const emails = await buildMarketInsightsWeeklyEmails();
  const db = getPrisma();
  let sent = 0;

  for (const e of emails) {
    try {
      await sendEmail({
        to: e.to,
        subject: e.subject,
        text: e.text,
        html: e.html,
      });
      await db.marketInsightsWeeklyDigest.create({
        data: { userId: e.userId, weekKey: e.weekKey },
      });
      sent += 1;
    } catch (err) {
      console.error("[cron.market-insights-weekly]", e.userId, err);
    }
  }

  return json({ ok: true, queued: emails.length, sent });
}
