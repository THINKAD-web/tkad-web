import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { sendSlackInsightAlert } from "@/lib/insights/notifiers/slack";

/** Neon PITR 보완용 일일 논리 스냅샷(행 수·체크섬) */
export async function runDailyOpsBackup(now = new Date()) {
  if (!isDatabaseConfigured()) {
    return { ok: false, reason: "db_not_configured" as const };
  }

  const db = getPrisma();
  const counts: Record<string, number> = {};

  try {
    await db.$queryRaw`SELECT 1`;
    counts.users = await db.user.count();
    counts.medias = await db.media.count();
    counts.contact_inquiries = await db.contactInquiry.count();
    counts.oo_h_quotes = await db.ooHQuote.count();
    counts.campaigns = await db.campaign.count();
    counts.page_views = await db.pageView.count({
      where: {
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    });

    const row = await db.opsBackupRun.create({
      data: {
        status: "ok",
        detail: "logical_snapshot",
        snapshot: counts,
      },
    });

    return { ok: true, id: row.id, counts };
  } catch (e) {
    const message = e instanceof Error ? e.message : "backup_failed";
    try {
      await db.opsBackupRun.create({
        data: {
          status: "failed",
          detail: message.slice(0, 2000),
        },
      });
    } catch {
      /* ignore */
    }

    await sendSlackInsightAlert({
      severity: "error",
      title: "DB 백업 스냅샷 실패",
      summary: message.slice(0, 500),
      adminUrl: process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/ko/admin/launch-monitor`
        : undefined,
    });

    return { ok: false, reason: "failed" as const, message };
  }
}
