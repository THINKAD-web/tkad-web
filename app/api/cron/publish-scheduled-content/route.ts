import { NextRequest } from "next/server";
import {
  ensureTrendReportSlug,
  syncTrendReportToReportTable,
} from "@/lib/content-auto/publish-sync";
import { json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const h = request.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

/** 예약 발행: scheduledAt 이 지난 draft 콘텐츠 자동 publish */
export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!isDatabaseConfigured()) {
    return json({ error: "Database not configured" }, 503);
  }

  const db = getPrisma();
  const now = new Date();
  const published: Array<{ kind: string; id: string; title: string }> = [];

  const trends = await db.trendReport.findMany({
    where: {
      status: "draft",
      scheduledAt: { lte: now },
    },
  });
  for (const tr of trends) {
    await db.trendReport.update({
      where: { id: tr.id },
      data: { status: "published", publishedAt: now },
    });
    await ensureTrendReportSlug(tr.id);
    await syncTrendReportToReportTable(tr.id);
    published.push({ kind: "trend_report", id: tr.id, title: tr.titleKo });
  }

  const education = await db.educationArticle.findMany({
    where: {
      status: "draft",
      scheduledAt: { lte: now },
    },
  });
  for (const row of education) {
    await db.educationArticle.update({
      where: { id: row.id },
      data: { status: "published", publishedAt: now },
    });
    published.push({ kind: "education_article", id: row.id, title: row.titleKo });
  }

  const guides = await db.guideArticle.findMany({
    where: {
      status: "draft",
      scheduledAt: { lte: now },
    },
  });
  for (const row of guides) {
    await db.guideArticle.update({
      where: { id: row.id },
      data: { status: "published", publishedAt: now },
    });
    published.push({ kind: "guide_article", id: row.id, title: row.titleKo });
  }

  return json({ ok: true, count: published.length, published });
}
