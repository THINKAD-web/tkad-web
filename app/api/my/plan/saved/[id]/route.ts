import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError, apiZodError } from "@/lib/api-response";
import type { PlanCartItem } from "@/lib/plan-cart";
import {
  type SavedPlanCartDetail,
  type SavedPlanCartReportSummary,
  type SavedPlanCartSource,
  type SavedPlanPublishIntent,
} from "@/lib/saved-plan-cart/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const PatchBodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  publishIntent: z.enum(["case", "community"]).nullable().optional(),
});

function toDetail(row: {
  id: string;
  title: string;
  description: string | null;
  source: string;
  items: unknown;
  campaignGoal: string | null;
  totalBudget: number | null;
  duration: number | null;
  reportSummary: unknown;
  mediaCount: number;
  regionsText: string | null;
  goalTitle: string | null;
  publishIntent: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SavedPlanCartDetail {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    source: row.source as SavedPlanCartSource,
    items: Array.isArray(row.items) ? (row.items as PlanCartItem[]) : [],
    campaignGoal: row.campaignGoal,
    totalBudget: row.totalBudget,
    duration: row.duration,
    reportSummary: row.reportSummary as SavedPlanCartReportSummary | null,
    mediaCount: row.mediaCount,
    regionsText: row.regionsText,
    goalTitle: row.goalTitle,
    publishIntent: row.publishIntent as SavedPlanPublishIntent | null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getOwnedRow(id: string, userId: string) {
  const db = getPrisma();
  return db.savedPlanCart.findFirst({
    where: { id, userId, deletedAt: null, status: "saved" },
  });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const { id } = await context.params;
    const row = await getOwnedRow(id, user.id);
    if (!row) {
      return apiError("NOT_FOUND", 404, { message: "저장된 플랜을 찾을 수 없습니다." });
    }

    return apiOk(toDetail(row));
  } catch (e) {
    return apiServerError(e, "my/plan/saved/[id]");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const { id } = await context.params;
    const existing = await getOwnedRow(id, user.id);
    if (!existing) {
      return apiError("NOT_FOUND", 404, { message: "저장된 플랜을 찾을 수 없습니다." });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("INVALID_JSON", 400);
    }

    const parsed = PatchBodySchema.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const db = getPrisma();
    const updated = await db.savedPlanCart.update({
      where: { id },
      data: {
        ...(parsed.data.title != null ? { title: parsed.data.title } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description }
          : {}),
        ...(parsed.data.publishIntent !== undefined
          ? { publishIntent: parsed.data.publishIntent }
          : {}),
      },
    });

    return apiOk(toDetail(updated));
  } catch (e) {
    return apiServerError(e, "my/plan/saved/[id]");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const { id } = await context.params;
    const existing = await getOwnedRow(id, user.id);
    if (!existing) {
      return apiError("NOT_FOUND", 404, { message: "저장된 플랜을 찾을 수 없습니다." });
    }

    const db = getPrisma();
    await db.savedPlanCart.update({
      where: { id },
      data: { status: "deleted", deletedAt: new Date() },
    });

    return apiOk({ id, deleted: true });
  } catch (e) {
    return apiServerError(e, "my/plan/saved/[id]");
  }
}
