import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAYS = 30;

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const db = getPrisma();

  const logs = await db.searchLog.findMany({
    where: { createdAt: { gte: since } },
    select: { query: true, resultCount: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const byQuery = new Map<
    string,
    { count: number; zeroCount: number; lastResultCount: number }
  >();

  for (const row of logs) {
    const key = row.query.trim().toLowerCase();
    if (!key) continue;
    const cur = byQuery.get(key) ?? {
      count: 0,
      zeroCount: 0,
      lastResultCount: row.resultCount,
    };
    cur.count += 1;
    if (row.resultCount === 0) cur.zeroCount += 1;
    cur.lastResultCount = row.resultCount;
    byQuery.set(key, cur);
  }

  const topQueries = [...byQuery.entries()]
    .map(([query, stats]) => ({
      query,
      count: stats.count,
      zeroCount: stats.zeroCount,
      lastResultCount: stats.lastResultCount,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const zeroResultQueries = [...byQuery.entries()]
    .filter(([, s]) => s.zeroCount > 0)
    .map(([query, stats]) => ({
      query,
      count: stats.zeroCount,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return json({
    days: DAYS,
    totalSearches: logs.length,
    topQueries,
    zeroResultQueries,
  });
}
