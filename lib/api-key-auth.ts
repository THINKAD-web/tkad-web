import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import type { ApiKey, ApiKeyPlan } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getClientIp } from "@/lib/api-response";

export const API_KEY_PREFIX = "tkad_sk_";

export const PLAN_MONTHLY_LIMITS: Record<ApiKeyPlan, number | null> = {
  FREE: 1000,
  PRO: 10_000,
  ENTERPRISE: null,
};

/** 분당 요청 수가 이 값을 넘으면 이상 트래픽으로 표시 */
export const ANOMALY_REQUESTS_PER_MINUTE = 100;

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKeySecret(): string {
  const rand = randomBytes(24).toString("base64url");
  return `${API_KEY_PREFIX}${rand}`;
}

/** 마스킹: tkad_sk_****xxxx (xxxx = 키 끝 4자) */
export function maskApiKey(keyLast4: string): string {
  const tail = keyLast4.slice(-4).padStart(4, "*");
  return `${API_KEY_PREFIX}****${tail}`;
}

function currentUsageMonth(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

export function getPlanLimit(plan: ApiKeyPlan): number | null {
  return PLAN_MONTHLY_LIMITS[plan];
}

export function parseBearerApiKey(request: NextRequest): string | null {
  const auth = request.headers.get("authorization")?.trim();
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token.startsWith(API_KEY_PREFIX)) return null;
  return token;
}

export type ApiKeyAuthResult =
  | { ok: true; apiKey: ApiKey }
  | { ok: false; status: number; error: string; message?: string };

export async function authenticateApiKey(
  request: NextRequest,
): Promise<ApiKeyAuthResult> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "SERVICE_UNAVAILABLE",
      message: "Database not configured",
    };
  }

  const raw = parseBearerApiKey(request);
  if (!raw) {
    return {
      ok: false,
      status: 401,
      error: "UNAUTHORIZED",
      message: "Missing or invalid Authorization: Bearer {apiKey}",
    };
  }

  const db = getPrisma();
  const keyHash = hashApiKey(raw);
  const apiKey = await db.apiKey.findUnique({ where: { keyHash } });

  if (!apiKey || !apiKey.isActive) {
    return {
      ok: false,
      status: 401,
      error: "UNAUTHORIZED",
      message: "Invalid or revoked API key",
    };
  }

  const month = currentUsageMonth();
  let requestCount = apiKey.requestCount;
  if (apiKey.usageMonth !== month) {
    requestCount = 0;
    await db.apiKey.update({
      where: { id: apiKey.id },
      data: { usageMonth: month, requestCount: 0 },
    });
  }

  const limit = getPlanLimit(apiKey.plan);
  if (limit != null && requestCount >= limit) {
    return {
      ok: false,
      status: 429,
      error: "RATE_LIMIT_EXCEEDED",
      message: `Monthly limit (${limit}) exceeded for plan ${apiKey.plan}. Resets next calendar month.`,
    };
  }

  return { ok: true, apiKey: { ...apiKey, requestCount, usageMonth: month } };
}

export async function recordApiKeyUsage(params: {
  apiKeyId: string;
  endpoint: string;
  method: string;
  status: number;
  ip: string | null;
}): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getPrisma();
  const month = currentUsageMonth();

  await db.$transaction([
    db.apiUsageLog.create({
      data: {
        apiKeyId: params.apiKeyId,
        endpoint: params.endpoint,
        method: params.method,
        status: params.status,
        ip: params.ip,
      },
    }),
    db.apiKey.update({
      where: { id: params.apiKeyId },
      data: {
        requestCount: { increment: 1 },
        usageMonth: month,
        lastUsedAt: new Date(),
      },
    }),
  ]);

  void maybeNotifyApiBurst(params.apiKeyId).catch((e) =>
    console.error("[api-key] burst alert", e),
  );
}

async function maybeNotifyApiBurst(apiKeyId: string): Promise<void> {
  const count = await countRequestsLastMinute(apiKeyId);
  if (count < ANOMALY_REQUESTS_PER_MINUTE) return;

  const db = getPrisma();
  const row = await db.apiKey.findUnique({
    where: { id: apiKeyId },
    select: {
      id: true,
      name: true,
      keyLast4: true,
      lastBurstAlertAt: true,
      user: { select: { email: true } },
    },
  });
  if (!row) return;

  const { shouldSendBurstAlert, notifySlackApiBurstTraffic } = await import(
    "@/lib/api-usage-slack"
  );
  if (!shouldSendBurstAlert(row.lastBurstAlertAt)) return;

  await db.apiKey.update({
    where: { id: apiKeyId },
    data: { lastBurstAlertAt: new Date() },
  });

  await notifySlackApiBurstTraffic({
    apiKeyId: row.id,
    keyName: row.name,
    keyLast4: row.keyLast4 || "????",
    userEmail: row.user.email,
    requestsPerMinute: count,
  });
}

export function v1Json(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export function v1Error(
  error: string,
  status: number,
  message?: string,
  extraHeaders?: Record<string, string>,
): Response {
  return v1Json({ error, message }, status, extraHeaders);
}

export async function withApiKeyAuth(
  request: NextRequest,
  endpoint: string,
  handler: (apiKey: ApiKey) => Promise<Response>,
): Promise<Response> {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) {
    const headers: Record<string, string> = {};
    if (auth.status === 429 && auth.message) {
      headers["retry-after"] = "86400";
    }
    return v1Error(auth.error, auth.status, auth.message, headers);
  }

  let response: Response;
  try {
    response = await handler(auth.apiKey);
  } catch (e) {
    console.error("[api-v1]", endpoint, e);
    response = v1Error("INTERNAL_ERROR", 500);
  }

  const ip = getClientIp(request);
  void recordApiKeyUsage({
    apiKeyId: auth.apiKey.id,
    endpoint,
    method: request.method,
    status: response.status,
    ip,
  });

  return response;
}

export async function countRequestsLastMinute(
  apiKeyId: string,
): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const since = new Date(Date.now() - 60_000);
  const db = getPrisma();
  return db.apiUsageLog.count({
    where: { apiKeyId, createdAt: { gte: since } },
  });
}
