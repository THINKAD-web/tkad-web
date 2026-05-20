/**
 * 분당 100회 초과 API 키 → Slack 알림 (recordApiKeyUsage 실시간 알림의 보조).
 * 스케줄: every 5 minutes (vercel cron)
 */

import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  ANOMALY_REQUESTS_PER_MINUTE,
  maskApiKey,
} from "@/lib/api-key-auth";
import {
  notifySlackApiBurstTraffic,
  shouldSendBurstAlert,
} from "@/lib/api-usage-slack";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!isDatabaseConfigured()) {
    return json({ ok: false, reason: "no_database" }, 200);
  }

  const since = new Date(Date.now() - 60_000);
  const db = getPrisma();

  const buckets = await db.$queryRaw<
    { api_key_id: string; count: bigint }[]
  >`
    SELECT api_key_id, COUNT(*)::bigint AS count
    FROM api_usage_logs
    WHERE created_at >= ${since}
    GROUP BY api_key_id
    HAVING COUNT(*) >= ${ANOMALY_REQUESTS_PER_MINUTE}
  `;

  let sent = 0;
  for (const row of buckets) {
    const key = await db.apiKey.findUnique({
      where: { id: row.api_key_id },
      select: {
        id: true,
        name: true,
        keyLast4: true,
        lastBurstAlertAt: true,
        user: { select: { email: true } },
      },
    });
    if (!key || !shouldSendBurstAlert(key.lastBurstAlertAt)) continue;

    await db.apiKey.update({
      where: { id: key.id },
      data: { lastBurstAlertAt: new Date() },
    });

    await notifySlackApiBurstTraffic({
      apiKeyId: key.id,
      keyName: key.name,
      keyLast4: key.keyLast4 || maskApiKey("????").slice(-4),
      userEmail: key.user.email,
      requestsPerMinute: Number(row.count),
    });
    sent += 1;
  }

  return json({ ok: true, checked: buckets.length, alertsSent: sent });
}
