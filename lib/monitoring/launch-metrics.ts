import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { countActiveSessions } from "@/lib/tracking/record";
import { loadSystemHealth } from "@/lib/monitoring/system-health";
import { isSentryConfigured } from "@/lib/sentry";

export type LaunchMonitorSnapshot = {
  configured: boolean;
  generatedAt: string;
  window: { hours: number; since: string };
  visitors: {
    activeNow: number;
    lastHourSessions: number;
  };
  signups: { lastHour: number; today: number };
  inquiries: { lastHour: number; today: number };
  errors: { lastHour: number; criticalLastHour: number };
  response: {
    webVitalsP75Ms: number | null;
    sampleCount: number;
  };
  database: { ok: boolean; detail?: string };
  backup: {
    lastRunAt: string | null;
    lastStatus: string | null;
    pitrNote: string;
  };
  sentry: { configured: boolean };
  ga4: { envId: boolean; dbConfigured: boolean };
};

function seoulDayStartUtc(now: Date): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, -9, 0, 0));
}

export async function loadLaunchMonitorSnapshot(
  hours = 1,
  now = new Date(),
): Promise<LaunchMonitorSnapshot> {
  const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const todayStart = seoulDayStartUtc(now);
  const gaEnvId = Boolean(process.env.NEXT_PUBLIC_GA_ID?.trim());

  if (!isDatabaseConfigured()) {
    const health = await loadSystemHealth();
    return {
      configured: false,
      generatedAt: now.toISOString(),
      window: { hours, since: since.toISOString() },
      visitors: { activeNow: 0, lastHourSessions: 0 },
      signups: { lastHour: 0, today: 0 },
      inquiries: { lastHour: 0, today: 0 },
      errors: { lastHour: 0, criticalLastHour: 0 },
      response: { webVitalsP75Ms: null, sampleCount: 0 },
      database: health.database,
      backup: {
        lastRunAt: null,
        lastStatus: null,
        pitrNote:
          "Neon 콘솔에서 Point-in-time restore(7일) 활성화를 확인하세요.",
      },
      sentry: { configured: isSentryConfigured() },
      ga4: { envId: gaEnvId, dbConfigured: false },
    };
  }

  const db = getPrisma();
  const [
    activeNow,
    hourSessions,
    signupsHour,
    signupsToday,
    inquiriesHour,
    inquiriesToday,
    errorsHour,
    criticalHour,
    vitalsRows,
    backupLast,
    analyticsRows,
  ] = await Promise.all([
    countActiveSessions(now),
    db.pageView.findMany({
      where: { createdAt: { gte: since } },
      distinct: ["sessionId"],
      select: { sessionId: true },
    }),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.user.count({ where: { createdAt: { gte: todayStart } } }),
    db.contactInquiry.count({ where: { createdAt: { gte: since } } }),
    db.contactInquiry.count({ where: { createdAt: { gte: todayStart } } }),
    db.opsErrorLog.count({ where: { createdAt: { gte: since } } }),
    db.opsErrorLog.count({
      where: { createdAt: { gte: since }, status: { gte: 500 } },
    }),
    db.webVital.findMany({
      where: { createdAt: { gte: since }, name: "LCP" },
      select: { value: true },
      orderBy: { value: "asc" },
      take: 200,
    }),
    db.opsBackupRun.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, status: true },
    }),
    db.analyticsIntegration.findMany({
      where: { provider: "ga4", enabled: true },
      select: { measurementId: true },
    }).catch(() => []),
  ]);

  const lcpValues = vitalsRows.map((r) => r.value).sort((a, b) => a - b);
  const p75 =
    lcpValues.length > 0
      ? lcpValues[Math.floor(lcpValues.length * 0.75)] ?? null
      : null;

  const health = await loadSystemHealth();

  return {
    configured: true,
    generatedAt: now.toISOString(),
    window: { hours, since: since.toISOString() },
    visitors: {
      activeNow,
      lastHourSessions: hourSessions.length,
    },
    signups: { lastHour: signupsHour, today: signupsToday },
    inquiries: { lastHour: inquiriesHour, today: inquiriesToday },
    errors: { lastHour: errorsHour, criticalLastHour: criticalHour },
    response: {
      webVitalsP75Ms: p75 != null ? Math.round(p75) : null,
      sampleCount: lcpValues.length,
    },
    database: health.database,
    backup: {
      lastRunAt: backupLast?.createdAt.toISOString() ?? null,
      lastStatus: backupLast?.status ?? null,
      pitrNote:
        "Neon PITR(7일) + 일일 스냅샷 크론 — Neon 콘솔에서 PITR 활성화를 확인하세요.",
    },
    sentry: { configured: isSentryConfigured() },
    ga4: {
      envId: gaEnvId,
      dbConfigured: analyticsRows.some((r) => Boolean(r.measurementId)),
    },
  };
}
