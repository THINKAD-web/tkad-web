import type { ReportCategory } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { DEMO_REPORTS } from "@/lib/report-demo-data";

export type RelatedReportRow = {
  slug: string;
  title: string;
  summary: string;
  category: ReportCategory;
  publishedAt: Date | null;
  thumbnail: string | null;
};

export async function listRelatedPublishedReports(
  slug: string,
  category: ReportCategory,
  limit = 3,
): Promise<RelatedReportRow[]> {
  if (!isDatabaseConfigured()) {
    return DEMO_REPORTS.filter((r) => r.slug !== slug)
      .sort((a, b) => {
        const score = (x: (typeof DEMO_REPORTS)[number]) =>
          (x.category === category ? 2 : 0) +
          (x.publishedAt?.getTime() ?? 0) / 1e15;
        return score(b) - score(a);
      })
      .slice(0, limit)
      .map((r) => ({
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        category: r.category,
        publishedAt: r.publishedAt,
        thumbnail: r.thumbnail,
      }));
  }

  const db = getPrisma();
  const same = await db.report.findMany({
    where: { published: true, category, slug: { not: slug } },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      slug: true,
      title: true,
      summary: true,
      category: true,
      publishedAt: true,
      thumbnail: true,
    },
  });

  if (same.length >= limit) return same;

  const exclude = [slug, ...same.map((s) => s.slug)];
  const fill = await db.report.findMany({
    where: { published: true, slug: { notIn: exclude } },
    orderBy: { publishedAt: "desc" },
    take: limit - same.length,
    select: {
      slug: true,
      title: true,
      summary: true,
      category: true,
      publishedAt: true,
      thumbnail: true,
    },
  });

  return [...same, ...fill];
}
