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
import {
  dateToSeoulYmd,
  seoulTargetYmd,
  seoulWeekdayShort,
} from "@/lib/seoul-calendar";

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
  const dayMs = 86400000;
  const soonEnd = new Date(now.getTime() + dayMs);
  const endToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
  );

  const d30ymd = seoulTargetYmd(30, now);
  const d7ymd = seoulTargetYmd(7, now);

  const [
    newInquiries,
    expiringContracts,
    dueFollowUps,
    inquiries24h,
    quotes24h,
    contractsWithDue,
    startingSoon,
    endingSoon,
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
    db.campaignFinancialDoc.findMany({
      where: {
        kind: FinancialDocKind.contract,
        status: FinancialDocStatus.sent,
        dueDate: { not: null },
      },
      take: 200,
      include: { campaign: { select: { name: true } } },
    }),
    db.campaignScheduleEvent.findMany({
      where: {
        startsAt: { gte: now, lte: soonEnd },
      },
      take: 40,
      include: { campaign: { select: { name: true } } },
    }),
    db.campaignScheduleEvent.findMany({
      where: {
        endsAt: { gte: now, lte: soonEnd },
      },
      take: 40,
      include: { campaign: { select: { name: true } } },
    }),
  ]);

  const d30list = contractsWithDue.filter(
    (d) => d.dueDate && dateToSeoulYmd(d.dueDate) === d30ymd,
  );
  const d7list = contractsWithDue.filter(
    (d) => d.dueDate && dateToSeoulYmd(d.dueDate) === d7ymd,
  );

  const weeklyExtra: string[] = [];
  if (seoulWeekdayShort(now) === "Mon") {
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const [wInq, wQuo, wCamp, wDone, wPaid] = await Promise.all([
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
    const rev = wPaid._sum.amountKrw ?? 0;
    weeklyExtra.push(
      "",
      "— 주간 요약 (서울 기준 월요일에만 포함) · 지난 7일 —",
      `신규 문의: ${wInq}건`,
      `신규 견적 요청: ${wQuo}건`,
      `신규 캠페인: ${wCamp}건`,
      `완료 캠페인(상태·수정 기준): ${wDone}건`,
      `유료 집계(청구·계약): ${(rev / 10000).toLocaleString("ko-KR")}만원`,
    );
  }

  const lines = [
    `[THINKAD] 일일 관리자 다이제스트 · ${now.toISOString().slice(0, 10)}`,
    "",
    `— 최근 24시간 —`,
    `신규 문의: ${inquiries24h}건 (샘플 ${newInquiries.length}건)`,
    `신규 견적 요청: ${quotes24h}건`,
    "",
    newInquiries.length
      ? "최근 문의:\n" +
          newInquiries
            .map(
              (i) =>
                `· ${i.company} / ${i.name} · ${i.createdAt.toISOString().slice(0, 16)}`,
            )
            .join("\n")
      : "최근 24시간 문의 없음.",
    "",
    `— 계약 만료 알림 (서울 기준 달력) —`,
    d30list.length
      ? `[D-30] 만료일이 오늘+30일인 계약:\n` +
          d30list
            .map(
              (d) =>
                `· ${d.campaign.name} · ${d.title} · 만료 ${d.dueDate ? dateToSeoulYmd(d.dueDate) : "—"}`,
            )
            .join("\n")
      : "[D-30] 해당 없음.",
    "",
    d7list.length
      ? `[D-7] 만료일이 오늘+7일인 계약:\n` +
          d7list
            .map(
              (d) =>
                `· ${d.campaign.name} · ${d.title} · 만료 ${d.dueDate ? dateToSeoulYmd(d.dueDate) : "—"}`,
            )
            .join("\n")
      : "[D-7] 해당 없음.",
    "",
    expiringContracts.length
      ? "7일 이내 만료 예정 계약(기존 윈도우):\n" +
          expiringContracts
            .map(
              (d) =>
                `· ${d.campaign.name} · ${d.title} · ${d.dueDate?.toISOString().slice(0, 10) ?? "—"}`,
            )
            .join("\n")
      : "7일 이내 만료 예정 계약 없음.",
    "",
    `— 송출 일정 (24시간 이내) —`,
    startingSoon.length
      ? "송출 시작 예정:\n" +
          startingSoon
            .map(
              (e) =>
                `· ${e.campaign.name} · ${e.title} · 시작 ${e.startsAt.toISOString().slice(0, 16)}`,
            )
            .join("\n")
      : "24시간 이내 시작 일정 없음.",
    "",
    endingSoon.length
      ? "송출 종료 예정:\n" +
          endingSoon
            .map(
              (e) =>
                `· ${e.campaign.name} · ${e.title} · 종료 ${e.endsAt.toISOString().slice(0, 16)}`,
            )
            .join("\n")
      : "24시간 이내 종료 일정 없음.",
    "",
    dueFollowUps.length
      ? "오늘 마감·지연 팔로업:\n" +
          dueFollowUps
            .map(
              (f) =>
                `· ${f.account.company} (${f.account.email}) · ${f.title} · ${f.dueAt.toISOString().slice(0, 16)}`,
            )
            .join("\n")
      : "오늘 마감 팔로업 없음.",
    ...weeklyExtra,
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
