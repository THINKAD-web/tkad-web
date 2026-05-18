import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import { getPrisma } from "@/lib/prisma";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import type { SavedPlannerPlanJson } from "@/lib/planner/contact-prefill";
import { summarizeSavedPlannerPlan } from "@/lib/planner/plan-summary";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const locale = request.nextUrl.searchParams.get("locale");
    const isKo = locale !== "en";

    const db = getPrisma();
    const rows = await db.savedPlannerPlan.findMany({
      where: {
        userEmail: user.email,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        planJson: true,
      },
    });

    const items = rows.map((row) => {
      const plan = row.planJson as unknown as SavedPlannerPlanJson;
      const summary = summarizeSavedPlannerPlan(
        plan,
        isKo,
        row.createdAt.toISOString(),
      );
      return {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
        title: summary.title,
        budgetManwon: summary.budgetManwon,
        mediaCount: summary.mediaCount,
      };
    });

    return apiOk({ items });
  } catch (e) {
    return apiServerError(e, "my/planner-plans");
  }
}
