import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** 통합 콘텐츠 목록 (draft 우선) */
export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const db = getPrisma();
  const [trends, education, guides] = await Promise.all([
    db.trendReport.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        slug: true,
        status: true,
        titleKo: true,
        month: true,
        scheduledAt: true,
        updatedAt: true,
        generationMethod: true,
      },
    }),
    db.educationArticle.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        slug: true,
        status: true,
        titleKo: true,
        topicKey: true,
        scheduledAt: true,
        updatedAt: true,
        generationMethod: true,
      },
    }),
    db.guideArticle.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        slug: true,
        status: true,
        titleKo: true,
        topicKey: true,
        scheduledAt: true,
        updatedAt: true,
        generationMethod: true,
      },
    }),
  ]);

  return json({
    trendReports: trends.map((r) => ({
      ...r,
      kind: "trend_report" as const,
      label: r.month ? `${r.month} · ${r.titleKo}` : r.titleKo,
    })),
    educationArticles: education.map((r) => ({
      ...r,
      kind: "education_article" as const,
      label: r.titleKo,
    })),
    guideArticles: guides.map((r) => ({
      ...r,
      kind: "guide_article" as const,
      label: r.titleKo,
    })),
  });
}
