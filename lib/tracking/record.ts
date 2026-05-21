import type { ConversionEventType, Prisma } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { touchVisitorJourney } from "@/lib/visitor-journey";

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export type RecordPageViewInput = {
  sessionId: string;
  path: string;
  locale?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  landingPath?: string | null;
};

export type RecordConversionInput = {
  type: ConversionEventType;
  sessionId?: string | null;
  path?: string | null;
  mediaId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** 페이지뷰 + 세션 최초 방문 시 visit 전환 이벤트 */
export async function recordPageView(input: RecordPageViewInput): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getPrisma();

  await db.pageView.create({
    data: {
      sessionId: input.sessionId,
      path: input.path.slice(0, 500),
      locale: input.locale?.slice(0, 8) ?? null,
      referrer: input.referrer?.slice(0, 500) ?? null,
      userAgent: input.userAgent?.slice(0, 512) ?? null,
    },
  });

  const priorVisit = await db.conversionEvent.findFirst({
    where: { sessionId: input.sessionId, type: "visit" },
    select: { id: true },
  });
  if (!priorVisit) {
    await db.conversionEvent.create({
      data: {
        sessionId: input.sessionId,
        type: "visit",
        path: input.path.slice(0, 500),
      },
    });
  }

  void touchVisitorJourney({
    sessionId: input.sessionId,
    step: "page_view",
    path: input.path,
    referrer: input.referrer,
    landingPath: input.landingPath,
    utm: {
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmContent: input.utmContent,
      utmTerm: input.utmTerm,
    },
  });
}

export async function recordConversion(input: RecordConversionInput): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getPrisma();
  await db.conversionEvent.create({
    data: {
      type: input.type,
      sessionId: input.sessionId?.slice(0, 64) ?? null,
      path: input.path?.slice(0, 500) ?? null,
      mediaId: input.mediaId?.slice(0, 64) ?? null,
      userId: input.userId?.slice(0, 64) ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function countActiveSessions(now = new Date()): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const since = new Date(now.getTime() - ACTIVE_WINDOW_MS);
  const db = getPrisma();
  const rows = await db.pageView.findMany({
    where: { createdAt: { gte: since } },
    distinct: ["sessionId"],
    select: { sessionId: true },
  });
  return rows.length;
}

export async function logOpsError(opts: {
  tag?: string;
  path?: string;
  status?: number;
  message?: string;
}): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    const db = getPrisma();
    await db.opsErrorLog.create({
      data: {
        tag: opts.tag?.slice(0, 120),
        path: opts.path?.slice(0, 500),
        status: opts.status ?? 500,
        message: opts.message?.slice(0, 4000),
      },
    });
  } catch {
    /* ignore logging failures */
  }
}
