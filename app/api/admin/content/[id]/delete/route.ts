import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const kind = new URL(request.url).searchParams.get("type");

  const db = getPrisma();

  if (kind === "trend_report") {
    await db.trendReport.delete({ where: { id } });
    return json({ ok: true });
  }
  if (kind === "education_article") {
    await db.educationArticle.delete({ where: { id } });
    return json({ ok: true });
  }
  if (kind === "guide_article") {
    await db.guideArticle.delete({ where: { id } });
    return json({ ok: true });
  }

  // kind 없으면 순차 탐색
  const tr = await db.trendReport.findUnique({ where: { id } });
  if (tr) {
    await db.trendReport.delete({ where: { id } });
    return json({ ok: true, kind: "trend_report" });
  }
  const edu = await db.educationArticle.findUnique({ where: { id } });
  if (edu) {
    await db.educationArticle.delete({ where: { id } });
    return json({ ok: true, kind: "education_article" });
  }
  const guide = await db.guideArticle.findUnique({ where: { id } });
  if (guide) {
    await db.guideArticle.delete({ where: { id } });
    return json({ ok: true, kind: "guide_article" });
  }

  return json({ error: "Not found" }, 404);
}
