import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { resolveIsPro } from "@/lib/ai-rate-limit";
import {
  planCartMaxItems,
  type PlanCartItem,
} from "@/lib/plan-cart";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  readJson,
} from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PlanCartItemSchema = z.object({
  mediaId: z.string().min(1),
  mediaName: z.string(),
  mediaType: z.string(),
  region: z.string(),
  price: z.number(),
  thumbnailUrl: z.string().optional(),
  addedFrom: z.enum(["ai_recommend", "planner", "search", "map", "package"]),
  addedAt: z.string(),
});

function syncBodySchema(maxItems: number) {
  return z.object({
    items: z.array(PlanCartItemSchema).max(maxItems),
    campaignGoal: z.string().optional(),
    totalBudget: z.number().optional(),
    duration: z.number().int().positive().optional(),
    updatedAt: z.string().optional(),
  });
}

function parseItems(raw: unknown): PlanCartItem[] {
  if (!Array.isArray(raw)) return [];
  const parsed = z.array(PlanCartItemSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

function mergeItems(
  local: PlanCartItem[],
  remote: PlanCartItem[],
  maxItems: number,
): PlanCartItem[] {
  const byId = new Map<string, PlanCartItem>();
  for (const item of [...remote, ...local]) {
    if (!byId.has(item.mediaId)) byId.set(item.mediaId, item);
  }
  return Array.from(byId.values()).slice(0, maxItems);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const row = await prisma.userSavedPlan.findUnique({
      where: { userId: user.id },
    });

    if (!row) {
      return apiOk({
        items: [],
        campaignGoal: undefined,
        totalBudget: undefined,
        duration: undefined,
        updatedAt: new Date().toISOString(),
      });
    }

    return apiOk({
      items: parseItems(row.items),
      campaignGoal: row.goal ?? undefined,
      totalBudget: row.budget ?? undefined,
      duration: row.duration ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (e) {
    return apiServerError(e, "my/plan/sync GET");
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);
    const maxItems = planCartMaxItems(await resolveIsPro(user.id));
    const parsed = syncBodySchema(maxItems).safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const existing = await prisma.userSavedPlan.findUnique({
      where: { userId: user.id },
    });

    const remoteItems = existing ? parseItems(existing.items) : [];
    const mergedItems = mergeItems(parsed.data.items, remoteItems, maxItems);

    const localUpdated = parsed.data.updatedAt
      ? Date.parse(parsed.data.updatedAt)
      : 0;
    const remoteUpdated = existing ? existing.updatedAt.getTime() : 0;
    const useLocalMeta = localUpdated >= remoteUpdated;

    const goal = useLocalMeta
      ? parsed.data.campaignGoal ?? existing?.goal ?? null
      : existing?.goal ?? parsed.data.campaignGoal ?? null;
    const budget = useLocalMeta
      ? parsed.data.totalBudget ?? existing?.budget ?? null
      : existing?.budget ?? parsed.data.totalBudget ?? null;
    const duration = useLocalMeta
      ? parsed.data.duration ?? existing?.duration ?? null
      : existing?.duration ?? parsed.data.duration ?? null;

    const row = await prisma.userSavedPlan.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        items: mergedItems as unknown as Prisma.InputJsonValue,
        goal,
        budget,
        duration,
      },
      update: {
        items: mergedItems as unknown as Prisma.InputJsonValue,
        goal,
        budget,
        duration,
      },
    });

    return apiOk({
      items: parseItems(row.items),
      campaignGoal: row.goal ?? undefined,
      totalBudget: row.budget ?? undefined,
      duration: row.duration ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (e) {
    return apiServerError(e, "my/plan/sync POST");
  }
}
