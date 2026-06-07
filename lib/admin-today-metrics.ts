import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type AdminTodayMetrics = {
  configured: boolean;
  signups: number;
  inquiries: number;
  quotes: number;
  chatbotSessions: number;
  plans: number;
};

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

  const [signups, inquiries, quotes, chatbotSessionRows, plans] =
    await Promise.all([
      db.user.count({ where: { createdAt: gte, deletedAt: null } }),
      db.contactInquiry.count({ where: { createdAt: gte } }),
      db.ooHQuote.count({ where: { createdAt: gte } }),
      db.chatbotLog.findMany({
        where: { createdAt: gte },
        distinct: ["sessionId"],
        select: { sessionId: true },
      }),
      db.savedPlannerPlan.count({ where: { createdAt: gte } }),
    ]);

  return {
    configured: true,
    signups,
    inquiries,
    quotes,
    chatbotSessions: chatbotSessionRows.length,
    plans,
  };
}
