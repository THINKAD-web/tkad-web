import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { notifyInquirySlaEscalation } from "@/lib/inquiry-slack-notify";
import { sendSlackInsightAlert } from "@/lib/insights/notifiers/slack";

const SLA_MS = 24 * 60 * 60 * 1000;

/** 24시간 내 firstResponseAt 없는 문의 → Slack 에스컬레이션 */
export async function runInquirySlaEscalation(now = new Date()) {
  if (!isDatabaseConfigured()) {
    return { escalated: 0, skipped: true };
  }

  const db = getPrisma();
  const cutoff = new Date(now.getTime() - SLA_MS);

  const stale = await db.contactInquiry.findMany({
    where: {
      createdAt: { lte: cutoff },
      firstResponseAt: null,
      slaEscalatedAt: null,
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      company: true,
      assigneeEmail: true,
      createdAt: true,
    },
  });

  if (stale.length === 0) return { escalated: 0 };

  const ids = stale.map((s) => s.id);
  await db.contactInquiry.updateMany({
    where: { id: { in: ids } },
    data: { slaEscalatedAt: now },
  });

  await notifyInquirySlaEscalation({
    count: stale.length,
    samples: stale,
  });

  for (const row of stale.slice(0, 3)) {
    if (row.assigneeEmail) {
      void sendSlackInsightAlert({
        severity: "warning",
        title: `담당자 알림: ${row.company}`,
        summary: `${row.assigneeEmail} — 문의 ${row.id.slice(0, 8)} 24시간 미응답`,
      }).catch(() => {});
    }
  }

  return { escalated: stale.length };
}
