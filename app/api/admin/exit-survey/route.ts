import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ANSWERS = ["found", "lost", "complex"] as const;

export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;
  if (!isDatabaseConfigured()) {
    return json({ configured: false, period: 30, surfaces: [], totals: null });
  }
  const raw = request.nextUrl.searchParams.get("period");
  const periodDays = raw === "7" ? 7 : 30;
  const since = new Date(Date.now() - periodDays * 86_400_000);

  try {
    const groups = await getPrisma().exitSurveyResponse.groupBy({
      by: ["surface", "answer"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });

    const bySurface = new Map<string, Record<string, number>>();
    const totalsByAnswer: Record<string, number> = { found: 0, lost: 0, complex: 0 };
    for (const g of groups) {
      const m = bySurface.get(g.surface) ?? { found: 0, lost: 0, complex: 0 };
      if ((ANSWERS as readonly string[]).includes(g.answer)) {
        m[g.answer] = g._count._all;
        totalsByAnswer[g.answer] = (totalsByAnswer[g.answer] ?? 0) + g._count._all;
      }
      bySurface.set(g.surface, m);
    }

    const surfaces = [...bySurface.entries()].map(([surface, counts]) => {
      const total = ANSWERS.reduce((s, a) => s + (counts[a] ?? 0), 0);
      return { surface, counts, total };
    });
    const total = ANSWERS.reduce((s, a) => s + totalsByAnswer[a], 0);

    return json({
      configured: true,
      period: periodDays,
      surfaces,
      totals: { counts: totalsByAnswer, total },
    });
  } catch (e) {
    console.error("[admin exit-survey]", e instanceof Error ? e.message : e);
    return json({ configured: true, period: periodDays, surfaces: [], totals: null });
  }
}
