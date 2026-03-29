/**
 * Stand-alone weekly email. Vercel Hobby allows 2 crons; the default setup
 * merges a 7-day block into Monday’s /api/cron/admin-digest instead.
 * Call this URL from an external scheduler (e.g. Upstash) if you want a separate weekly mail.
 */
import { NextRequest } from "next/server";
import {
  CampaignStatus,
  FinancialDocKind,
  FinancialDocStatus,
} from "@prisma/client";
import { json } from "@/lib/admin-guard";
import { sendEmail } from "@/lib/email/client";
import { isEmailConfigured } from "@/lib/email/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const to =
    process.env.WEEKLY_SUMMARY_EMAIL?.trim() ||
    process.env.ADMIN_DIGEST_EMAIL?.trim() ||
    process.env.CONTACT_ALERT_EMAIL?.trim();
  if (!to || !isEmailConfigured()) {
    return json({ ok: false, reason: "no_recipient_or_email" }, 200);
  }

  if (!isDatabaseConfigured()) {
    return json({ ok: false, reason: "no_database" }, 200);
  }

  const db = getPrisma();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [
    inquiries,
    quotes,
    newCampaigns,
    completedCampaigns,
    paidWeek,
  ] = await Promise.all([
    db.contactInquiry.count({ where: { createdAt: { gte: weekAgo } } }),
    db.quoteRequest.count({ where: { createdAt: { gte: weekAgo } } }),
    db.campaign.count({ where: { createdAt: { gte: weekAgo } } }),
    db.campaign.count({
      where: {
        status: CampaignStatus.completed,
        updatedAt: { gte: weekAgo },
      },
    }),
    db.campaignFinancialDoc.aggregate({
      where: {
        status: FinancialDocStatus.paid,
        paidAt: { gte: weekAgo },
        kind: {
          in: [FinancialDocKind.invoice, FinancialDocKind.contract],
        },
      },
      _sum: { amountKrw: true },
    }),
  ]);

  const revenue = paidWeek._sum.amountKrw ?? 0;
  const lines = [
    `[THINKAD] 주간 운영 요약 · 지난 7일 (${weekAgo.toISOString().slice(0, 10)} ~ ${now.toISOString().slice(0, 10)})`,
    "",
    `신규 문의: ${inquiries}건`,
    `신규 견적 요청: ${quotes}건`,
    `신규 캠페인: ${newCampaigns}건`,
    `완료 처리된 캠페인(상태·수정 기준): ${completedCampaigns}건`,
    `유료 집계(청구·계약, 7일): ${(revenue / 10000).toLocaleString("ko-KR")}만원`,
    "",
    "※ Vercel Cron으로 매주 월요일 10:00(KST) 전후에 실행됩니다.",
  ];

  const text = lines.join("\n");
  const html = `<pre style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.55">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</pre>`;

  try {
    await sendEmail({
      to,
      subject: `[THINKAD] 주간 요약 · ${now.toISOString().slice(0, 10)}`,
      text,
      html,
    });
    return json({ ok: true, sent: true });
  } catch (e) {
    console.error("[cron/weekly-summary]", e);
    return json({ ok: false, error: "send_failed" }, 502);
  }
}
