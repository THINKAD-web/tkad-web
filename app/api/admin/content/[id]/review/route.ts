import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();

  const trend = await db.trendReport.findUnique({ where: { id } });
  if (trend) {
    const updated = await db.trendReport.update({
      where: { id },
      data: { status: "reviewed" },
    });
    return json({ kind: "trend_report" as const, content: updated });
  }

  const lesson = await db.academyLesson.findUnique({ where: { id } });
  if (lesson) {
    const updated = await db.academyLesson.update({
      where: { id },
      data: { status: "reviewed" },
    });
    return json({ kind: "academy_lesson" as const, content: updated });
  }

  const successCase = await db.successCase.findUnique({ where: { id } });
  if (successCase) {
    const updated = await db.successCase.update({
      where: { id },
      data: { status: "reviewed" },
    });
    return json({ kind: "success_case" as const, content: updated });
  }

  return json({ error: "Not found" }, 404);
}
