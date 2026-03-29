import { NextRequest } from "next/server";
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

/** YYYY-MM-DD in Asia/Seoul */
function seoulYmd(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!isDatabaseConfigured() || !isEmailConfigured()) {
    return json({ ok: false, reason: "db_or_email" }, 200);
  }

  const db = getPrisma();
  const todaySeoul = seoulYmd(new Date());

  const rows = await db.crmFollowUp.findMany({
    where: {
      doneAt: null,
      reminderSentAt: null,
      remindEmail: { not: null },
    },
    include: {
      account: { select: { company: true, name: true, email: true } },
    },
  });

  let sent = 0;
  for (const row of rows) {
    const dueSeoul = seoulYmd(new Date(row.dueAt));
    if (dueSeoul !== todaySeoul) continue;
    const to = row.remindEmail!.trim();
    if (!to) continue;

    const subject = `[THINKAD] 팔로업 알림 · ${row.title}`;
    const text = [
      `${row.account.company} / ${row.account.name} 고객 관련 팔로업입니다.`,
      "",
      `제목: ${row.title}`,
      `마감(등록 시각 기준, 서울 날짜): ${dueSeoul}`,
      `고객 이메일: ${row.account.email}`,
      "",
      "이 메일은 CRM에 등록한 팔로업 알림 주소로 발송되었습니다.",
    ].join("\n");

    const html = `<pre style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5">${text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")}</pre>`;

    try {
      await sendEmail({ to, subject, text, html });
      await db.crmFollowUp.update({
        where: { id: row.id },
        data: { reminderSentAt: new Date() },
      });
      sent += 1;
    } catch (e) {
      console.error("[cron/followup-reminders]", row.id, e);
    }
  }

  return json({ ok: true, sent, checked: rows.length });
}
