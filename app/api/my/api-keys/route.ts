import { z } from "zod";
import type { ApiKeyPlan } from "@prisma/client";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
} from "@/lib/api-response";
import { getCurrentUser } from "@/lib/user-session";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  generateApiKeySecret,
  getPlanLimit,
  hashApiKey,
  maskApiKey,
} from "@/lib/api-key-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  plan: z.enum(["FREE", "PRO", "ENTERPRISE"]).optional(),
});

function formatKeyRow(row: {
  id: string;
  name: string;
  keyLast4: string;
  plan: ApiKeyPlan;
  requestCount: number;
  usageMonth: string;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}) {
  const limit = getPlanLimit(row.plan);
  return {
    id: row.id,
    name: row.name,
    maskedKey: maskApiKey(row.keyLast4 || "????"),
    plan: row.plan,
    monthlyUsage: row.requestCount,
    monthlyLimit: limit,
    usageMonth: row.usageMonth,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
  }
  if (!isDatabaseConfigured()) {
    return apiError("SERVICE_UNAVAILABLE", 503, {
      message: "Database not configured",
    });
  }

  const db = getPrisma();
  const keys = await db.apiKey.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyLast4: true,
      plan: true,
      requestCount: true,
      usageMonth: true,
      lastUsedAt: true,
      isActive: true,
      createdAt: true,
    },
  });

  return apiOk({ keys: keys.map(formatKeyRow) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
  }
  if (!isDatabaseConfigured()) {
    return apiError("SERVICE_UNAVAILABLE", 503, {
      message: "Database not configured",
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_INPUT", 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiZodError(parsed.error);

  const secret = generateApiKeySecret();
  const keyHash = hashApiKey(secret);
  const keyPrefix = secret.slice(0, 16);
  const keyLast4 = secret.slice(-4);
  const plan = (parsed.data.plan ?? "FREE") as ApiKeyPlan;

  const db = getPrisma();
  const activeCount = await db.apiKey.count({
    where: { userId: user.id, isActive: true },
  });
  if (activeCount >= 10) {
    return apiError("LIMIT_REACHED", 400, {
      message: "활성 API 키는 최대 10개까지 발급할 수 있습니다.",
    });
  }

  try {
    const row = await db.apiKey.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        keyHash,
        keyPrefix,
        keyLast4,
        plan,
      },
      select: {
        id: true,
        name: true,
        keyLast4: true,
        plan: true,
        requestCount: true,
        usageMonth: true,
        lastUsedAt: true,
        isActive: true,
        createdAt: true,
      },
    });

    return apiOk({
      key: formatKeyRow(row),
      secret,
      message:
        "이 키는 이번에만 표시됩니다. 안전한 곳에 저장한 뒤 다시 확인할 수 없습니다.",
    });
  } catch (e) {
    return apiServerError(e, "my-api-keys-create");
  }
}
