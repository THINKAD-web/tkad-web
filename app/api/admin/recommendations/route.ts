import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { assertAdminDb } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      totalRequests: 0,
      conversionRate: 0,
      topMedia: [],
      recentLogs: [],
    });
  }

  const db = getPrisma();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalRequests, converted, logs] = await Promise.all([
    db.recommendationLog.count({ where: { createdAt: { gte: since } } }),
    db.recommendationLog.count({
      where: { createdAt: { gte: since }, convertedToInquiry: true },
    }),
    db.recommendationLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        source: true,
        input: true,
        recommendations: true,
        selectedMediaIds: true,
        convertedToInquiry: true,
        createdAt: true,
      },
    }),
  ]);

  const mediaCounts = new Map<string, number>();
  for (const log of logs) {
    const recs = log.recommendations;
    if (!Array.isArray(recs)) continue;
    for (const r of recs) {
      const id =
        typeof r === "object" && r && "mediaId" in r ?
          String((r as { mediaId: string }).mediaId)
        : null;
      if (id) mediaCounts.set(id, (mediaCounts.get(id) ?? 0) + 1);
    }
  }

  const topMedia = [...mediaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([mediaId, count]) => ({ mediaId, count }));

  const conversionRate =
    totalRequests > 0 ? Math.round((converted / totalRequests) * 1000) / 10 : 0;

  return NextResponse.json({
    totalRequests,
    converted,
    conversionRate,
    topMedia,
    recentLogs: logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
