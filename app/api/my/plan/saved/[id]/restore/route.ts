import { NextRequest } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import type { PlanCartItem } from "@/lib/plan-cart";
import { snapshotToPlanCart } from "@/lib/saved-plan-cart/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const { id } = await context.params;
    const db = getPrisma();
    const row = await db.savedPlanCart.findFirst({
      where: { id, userId: user.id, deletedAt: null, status: "saved" },
    });
    if (!row) {
      return apiError("NOT_FOUND", 404, { message: "저장된 플랜을 찾을 수 없습니다." });
    }

    const cart = snapshotToPlanCart({
      items: Array.isArray(row.items) ? (row.items as unknown as PlanCartItem[]) : [],
      campaignGoal: row.campaignGoal ?? undefined,
      totalBudget: row.totalBudget ?? undefined,
      duration: row.duration ?? undefined,
      updatedAt: new Date().toISOString(),
    });

    await db.savedPlanCart.update({
      where: { id: row.id },
      data: {
        restoreCount: { increment: 1 },
        lastRestoredAt: new Date(),
      },
    });

    return apiOk({ cart });
  } catch (e) {
    return apiServerError(e, "my/plan/saved/[id]/restore");
  }
}
