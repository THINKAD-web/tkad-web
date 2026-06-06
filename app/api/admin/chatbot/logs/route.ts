import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
/** Grok 토큰 1K당 추정 단가(USD) — 비용 추정용 (env 로 조정) */
const USD_PER_1K = Number(process.env.CHATBOT_USD_PER_1K ?? "0.004") || 0.004;

export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;
  if (!isDatabaseConfigured()) {
    return json({ configured: false, stats: null, sessions: [] });
  }

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const search = sp.get("search")?.trim() ?? "";
  const fromRaw = sp.get("from")?.trim();
  const toRaw = sp.get("to")?.trim();

  const from = fromRaw ? new Date(fromRaw) : null;
  const to = toRaw ? new Date(toRaw) : null;
  const rangeWhere =
    from || to
      ? {
          createdAt: {
            ...(from && !Number.isNaN(+from) ? { gte: from } : {}),
            ...(to && !Number.isNaN(+to) ? { lte: to } : {}),
          },
        }
      : {};
  const searchWhere = search
    ? {
        OR: [
          { message: { contains: search, mode: "insensitive" as const } },
          { userName: { contains: search, mode: "insensitive" as const } },
          { userEmail: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};
  const where = { ...rangeWhere, ...searchWhere };

  const db = getPrisma();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  // ── 통계 ──
  const [todayTurns, weekTurns, totalTurns, tokenAgg, sessionGroupsAll] =
    await Promise.all([
      db.chatbotLog.count({ where: { role: "user", createdAt: { gte: todayStart } } }),
      db.chatbotLog.count({ where: { role: "user", createdAt: { gte: weekStart } } }),
      db.chatbotLog.count({ where: { role: "user" } }),
      db.chatbotLog.aggregate({ _sum: { tokensUsed: true } }),
      db.chatbotLog.findMany({ distinct: ["sessionId"], select: { sessionId: true } }),
    ]);
  const totalSessions = sessionGroupsAll.length;
  const totalTokens = tokenAgg._sum.tokensUsed ?? 0;

  // ── 세션 목록 (필터 적용, 최신순, 페이지네이션) ──
  const groups = await db.chatbotLog.groupBy({
    by: ["sessionId"],
    where,
    _count: { _all: true },
    _max: { createdAt: true },
    _min: { createdAt: true },
    _sum: { tokensUsed: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: PAGE_SIZE + 1,
    skip: (page - 1) * PAGE_SIZE,
  });
  const hasMore = groups.length > PAGE_SIZE;
  const pageGroups = groups.slice(0, PAGE_SIZE);
  const sessionIds = pageGroups.map((g) => g.sessionId);

  // 세션별 메타 + 첫 질문
  const rows = sessionIds.length
    ? await db.chatbotLog.findMany({
        where: { sessionId: { in: sessionIds } },
        orderBy: { createdAt: "asc" },
        select: {
          sessionId: true,
          role: true,
          message: true,
          userName: true,
          userEmail: true,
          userId: true,
          ip: true,
          pageUrl: true,
          model: true,
          createdAt: true,
        },
      })
    : [];
  const metaBySession = new Map<
    string,
    {
      firstQuestion: string;
      userName: string | null;
      userEmail: string | null;
      userId: string | null;
      ip: string | null;
      pageUrl: string | null;
      model: string | null;
    }
  >();
  for (const r of rows) {
    if (!metaBySession.has(r.sessionId)) {
      metaBySession.set(r.sessionId, {
        firstQuestion: "",
        userName: r.userName,
        userEmail: r.userEmail,
        userId: r.userId,
        ip: r.ip,
        pageUrl: r.pageUrl,
        model: r.model,
      });
    }
    const meta = metaBySession.get(r.sessionId)!;
    if (!meta.firstQuestion && r.role === "user") meta.firstQuestion = r.message;
    if (!meta.userName && r.userName) meta.userName = r.userName;
    if (!meta.userEmail && r.userEmail) meta.userEmail = r.userEmail;
  }

  const sessions = pageGroups.map((g) => {
    const meta = metaBySession.get(g.sessionId);
    const turns = Math.ceil(g._count._all / 2); // user+assistant = 1 turn
    return {
      sessionId: g.sessionId,
      lastAt: g._max.createdAt,
      firstAt: g._min.createdAt,
      messages: g._count._all,
      turns,
      tokensUsed: g._sum.tokensUsed ?? 0,
      firstQuestion: meta?.firstQuestion ?? "",
      userName: meta?.userName ?? null,
      userEmail: meta?.userEmail ?? null,
      userId: meta?.userId ?? null,
      ip: meta?.ip ?? null,
      pageUrl: meta?.pageUrl ?? null,
      model: meta?.model ?? null,
    };
  });

  return json({
    configured: true,
    stats: {
      todayTurns,
      weekTurns,
      totalTurns,
      totalSessions,
      avgTurnsPerSession: totalSessions
        ? Math.round((totalTurns / totalSessions) * 10) / 10
        : 0,
      totalTokens,
      estCostUsd: Math.round((totalTokens / 1000) * USD_PER_1K * 100) / 100,
    },
    sessions,
    page,
    pageSize: PAGE_SIZE,
    hasMore,
  });
}
