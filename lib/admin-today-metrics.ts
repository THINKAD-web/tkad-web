import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type AdminTodayMetrics = {
  configured: boolean;
  signups: number;
  inquiries: number;
  quotes: number;
  chatbotSessions: number;
  plans: number;
};

/** 마이그레이션 미적용 등으로 일부 테이블이 없어도 전체 대시보드가 죽지 않도록 0 폴백. */
async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch (e) {
    console.error("[admin-today-metrics] query failed", e instanceof Error ? e.message : e);
    return 0;
  }
}

/** 어드민 메인 — 오늘(자정 기준) 자체 DB 핵심 지표 (GA4 와 별개). */
export async function loadAdminTodayMetrics(): Promise<AdminTodayMetrics> {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      signups: 0,
      inquiries: 0,
      quotes: 0,
      chatbotSessions: 0,
      plans: 0,
    };
  }
  const db = getPrisma();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const gte = { gte: todayStart };

  const [signups, inquiries, quotes, chatbotSessions, plans] = await Promise.all([
    safeCount(() => db.user.count({ where: { createdAt: gte, deletedAt: null } })),
    safeCount(() => db.contactInquiry.count({ where: { createdAt: gte } })),
    safeCount(() => db.ooHQuote.count({ where: { createdAt: gte } })),
    safeCount(async () => {
      const rows = await db.chatbotLog.findMany({
        where: { createdAt: gte },
        distinct: ["sessionId"],
        select: { sessionId: true },
      });
      return rows.length;
    }),
    safeCount(() => db.savedPlannerPlan.count({ where: { createdAt: gte } })),
  ]);

  return { configured: true, signups, inquiries, quotes, chatbotSessions, plans };
}
