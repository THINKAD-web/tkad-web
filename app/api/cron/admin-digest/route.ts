import { NextRequest } from "next/server";
import { FinancialDocKind, FinancialDocStatus } from "@prisma/client";
import { json } from "@/lib/admin-guard";
import { sendEmail } from "@/lib/email/client";
import { isEmailConfigured } from "@/lib/email/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

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

  const to =
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
  const dayAgo = new Date(now.getTime() - 86400000);
  const weekAhead = new Date(now.getTime() + 7 * 86400000);
  const endToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
  );

  const [
    newInquiries,
    expiringContracts,
    dueFollowUps,
    inquiries24h,
    quotes24h,
  ] = await Promise.all([
    db.contactInquiry.findMany({
      where: { createdAt: { gte: dayAgo } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { company: true, name: true, createdAt: true },
    }),
    db.campaignFinancialDoc.findMany({
      where: {
        kind: FinancialDocKind.contract,
        status: FinancialDocStatus.sent,
        dueDate: { lte: weekAhead, gte: now },
      },
      take: 20,
      include: { campaign: { select: { name: true } } },
    }),
    db.crmFollowUp.findMany({
      where: {
        doneAt: null,
        dueAt: { lte: endToday },
      },
      take: 30,
      include: { account: { select: { company: true, email: true } } },
    }),
    db.contactInquiry.count({
      where: { createdAt: { gte: dayAgo } },
    }),
    db.quoteRequest.count({
      where: { createdAt: { gte: dayAgo } },
    }),
  ]);

  const lines = [
    `[THINKAD] Admin daily digest · ${now.toISOString().slice(0, 10)}`,
    "",
    `— Last 24h —`,
    `New inquiries: ${inquiries24h} (sample rows below: ${newInquiries.length})`,
    `New quote requests: ${quotes24h}`,
    "",
    newInquiries.length
      ? "Recent inquiries:\n" +
          newInquiries
            .map(
              (i) =>
                `· ${i.company} / ${i.name} · ${i.createdAt.toISOString().slice(0, 16)}`,
            )
            .join("\n")
      : "No new inquiries in the last 24h.",
    "",
    expiringContracts.length
      ? "Contracts due within 7 days:\n" +
          expiringContracts
            .map(
              (d) =>
                `· ${d.campaign.name} · ${d.title} · due ${d.dueDate?.toISOString().slice(0, 10) ?? "—"}`,
            )
            .join("\n")
      : "No contracts due within 7 days.",
    "",
    dueFollowUps.length
      ? "Follow-ups due today or overdue:\n" +
          dueFollowUps
            .map(
              (f) =>
                `· ${f.account.company} (${f.account.email}) · ${f.title} · ${f.dueAt.toISOString().slice(0, 16)}`,
            )
            .join("\n")
      : "No follow-ups due today.",
  ];

  const text = lines.join("\n");
  const html = `<pre style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.5">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</pre>`;

  try {
    await sendEmail({
      to,
      subject: `[THINKAD] 일일 관리자 다이제스트 · ${now.toISOString().slice(0, 10)}`,
      text,
      html,
    });
    return json({ ok: true, sent: true });
  } catch (e) {
    console.error("[cron/admin-digest]", e);
    return json({ ok: false, error: "send_failed" }, 502);
  }
}
