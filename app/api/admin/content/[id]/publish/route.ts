import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  ensureTrendReportSlug,
  syncTrendReportToReportTable,
} from "@/lib/content-auto/publish-sync";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let body: { scheduledAt?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    // immediate publish
  }

  const now = new Date();
  const publishAt =
    body.scheduledAt && new Date(body.scheduledAt) > now
      ? null
      : now;
  const scheduledAt =
    body.scheduledAt && new Date(body.scheduledAt) > now
      ? new Date(body.scheduledAt)
      : null;

  const db = getPrisma();

  const trend = await db.trendReport.findUnique({ where: { id } });
  if (trend) {
    const updated = await db.trendReport.update({
      where: { id },
      data: {
        status: scheduledAt ? "draft" : "published",
        publishedAt: publishAt,
        scheduledAt,
      },
    });
    if (!scheduledAt) {
      await ensureTrendReportSlug(id);
      await syncTrendReportToReportTable(id);
    }
    return json({ kind: "trend_report" as const, content: updated });
  }

  const education = await db.educationArticle.findUnique({ where: { id } });
  if (education) {
    const updated = await db.educationArticle.update({
      where: { id },
      data: {
        status: scheduledAt ? "draft" : "published",
        publishedAt: publishAt,
        scheduledAt,
      },
    });
    return json({ kind: "education_article" as const, content: updated });
  }

  const guide = await db.guideArticle.findUnique({ where: { id } });
  if (guide) {
    const updated = await db.guideArticle.update({
      where: { id },
      data: {
        status: scheduledAt ? "draft" : "published",
        publishedAt: publishAt,
        scheduledAt,
      },
    });
    return json({ kind: "guide_article" as const, content: updated });
  }

  const lesson = await db.academyLesson.findUnique({ where: { id } });
  if (lesson) {
    const updated = await db.academyLesson.update({
      where: { id },
      data: { status: "published", publishedAt: now },
    });
    return json({ kind: "academy_lesson" as const, content: updated });
  }

  const successCase = await db.successCase.findUnique({ where: { id } });
  if (successCase) {
    const updated = await db.successCase.update({
      where: { id },
      data: { status: "published", publishedAt: now },
    });
    return json({ kind: "success_case" as const, content: updated });
  }

  return json({ error: "Not found" }, 404);
}
