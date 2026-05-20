import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import {
  ANOMALY_REQUESTS_PER_MINUTE,
  getPlanLimit,
  maskApiKey,
} from "@/lib/api-key-auth";

export const dynamic = "force-dynamic";

const DAYS = 30;

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const db = getPrisma();

  const [keys, logs, minuteBuckets] = await Promise.all([
    db.apiKey.findMany({
      orderBy: { lastUsedAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true, company: true } },
      },
    }),
    db.apiUsageLog.findMany({
      where: { createdAt: { gte: since } },
      select: { endpoint: true, status: true, apiKeyId: true, createdAt: true },
      take: 20_000,
    }),
    db.$queryRaw<
      { api_key_id: string; minute: Date; count: bigint }[]
    >`
      SELECT api_key_id, date_trunc('minute', created_at) AS minute, COUNT(*)::bigint AS count
      FROM api_usage_logs
      WHERE created_at >= ${since}
      GROUP BY api_key_id, date_trunc('minute', created_at)
      HAVING COUNT(*) > ${ANOMALY_REQUESTS_PER_MINUTE}
      ORDER BY count DESC
      LIMIT 50
    `,
  ]);

  const endpointStats = new Map<
    string,
    { count: number; errors: number }
  >();
  for (const log of logs) {
    const cur = endpointStats.get(log.endpoint) ?? { count: 0, errors: 0 };
    cur.count += 1;
    if (log.status >= 400) cur.errors += 1;
    endpointStats.set(log.endpoint, cur);
  }

  const byEndpoint = [...endpointStats.entries()]
    .map(([endpoint, stats]) => ({ endpoint, ...stats }))
    .sort((a, b) => b.count - a.count);

  const keyById = new Map(keys.map((k) => [k.id, k]));

  const anomalies = minuteBuckets.map((row) => {
    const key = keyById.get(row.api_key_id);
    return {
      apiKeyId: row.api_key_id,
      keyName: key?.name ?? "—",
      maskedKey: key ? maskApiKey(key.keyLast4 || "????") : "—",
      userEmail: key?.user.email ?? "—",
      minute: row.minute.toISOString(),
      requestsPerMinute: Number(row.count),
      threshold: ANOMALY_REQUESTS_PER_MINUTE,
    };
  });

  return json({
    days: DAYS,
    totalRequests: logs.length,
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      maskedKey: maskApiKey(k.keyLast4 || "????"),
      plan: k.plan,
      monthlyUsage: k.requestCount,
      monthlyLimit: getPlanLimit(k.plan),
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
      user: k.user,
    })),
    byEndpoint,
    anomalies,
    anomalyAlert:
      anomalies.length > 0
        ? `${anomalies.length}건의 분당 ${ANOMALY_REQUESTS_PER_MINUTE}회 초과 트래픽이 감지되었습니다.`
        : null,
  });
}
