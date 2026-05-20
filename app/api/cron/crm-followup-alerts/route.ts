import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { buildAlertsForPipelineCard } from "@/lib/crm-alerts";
import { sendCrmSlackAlert } from "@/lib/crm-slack-notify";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** 매일 09:00 KST (00:00 UTC) — 팔로업 Slack 알림 */
export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!isDatabaseConfigured()) {
    return json({ ok: false, reason: "db" }, 200);
  }

  const db = getPrisma();
  const cards = await db.pipelineCard.findMany({
    where: { stage: { not: "completed" } },
  });

  const allAlerts = cards.flatMap(buildAlertsForPipelineCard);
  if (!allAlerts.length) {
    return json({ ok: true, alertCount: 0, slack: { ok: true, skipped: true } });
  }

  const stale = allAlerts.filter((a) => a.type === "contact_stale");
  const quoteStale = allAlerts.filter((a) => a.type === "quote_no_response");

  const lines: string[] = [];
  if (stale.length) {
    lines.push(`*마지막 접촉 3일 경과 (${stale.length}건)*`);
    for (const a of stale.slice(0, 10)) {
      lines.push(`• ${a.message}${a.assignedTo ? ` — @${a.assignedTo}` : ""}`);
    }
  }
  if (quoteStale.length) {
    lines.push(`*견적 발송 5일 미응답 (${quoteStale.length}건)*`);
    for (const a of quoteStale.slice(0, 10)) {
      lines.push(`• ${a.message}${a.assignedTo ? ` — @${a.assignedTo}` : ""}`);
    }
  }

  const slack = await sendCrmSlackAlert({
    title: "CRM 팔로업 알림",
    summary: `총 ${allAlerts.length}건의 후속 조치가 필요합니다.`,
    lines,
  });

  return json({
    ok: true,
    alertCount: allAlerts.length,
    stale: stale.length,
    quoteStale: quoteStale.length,
    slack,
  });
}
