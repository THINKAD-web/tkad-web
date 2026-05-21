import type { ReportCategory } from "@prisma/client";
import { inferTrendReportCategory } from "@/lib/content-auto/trend-report-category";
import { injectInternalLinks } from "@/lib/content-auto/seo";
import {
  ensureTrendReportSlug,
  syncTrendReportToReportTable,
} from "@/lib/content-auto/publish-sync";
import { siteUrl } from "@/lib/seo";
import { getPrisma } from "@/lib/prisma";

export function trendReportOgThumbnailUrl(slug: string, locale = "ko"): string {
  return `${siteUrl}/${locale}/report/opengraph-image`;
}

export function ensureThinkadCta(content: string): string {
  if (/플래너|thinkad|싱커드/i.test(content)) return content;
  const { content: withCta } = injectInternalLinks(content);
  return withCta;
}

export async function publishTrendReportRow(
  trendReportId: string,
  category?: ReportCategory,
): Promise<{ slug: string; category: ReportCategory }> {
  const db = getPrisma();
  const row = await db.trendReport.findUnique({ where: { id: trendReportId } });
  if (!row) throw new Error("TrendReport not found");

  const slug = await ensureTrendReportSlug(trendReportId);
  const cat =
    category ??
    inferTrendReportCategory({
      slug,
      titleKo: row.titleKo,
    });

  const contentKo = ensureThinkadCta(row.contentKo);
  const thumb = trendReportOgThumbnailUrl(slug);

  await db.trendReport.update({
    where: { id: trendReportId },
    data: {
      slug,
      status: "published",
      publishedAt: row.publishedAt ?? new Date(),
      contentKo,
      thumbnailUrl: thumb,
      tags: row.tags?.length ? row.tags : [cat, "OOH", "seed"],
    },
  });

  await syncTrendReportToReportTable(trendReportId, cat);

  return { slug, category: cat };
}

export async function publishGuideArticle(id: string): Promise<void> {
  const db = getPrisma();
  await db.guideArticle.update({
    where: { id },
    data: {
      status: "published",
      publishedAt: new Date(),
    },
  });
}

export async function publishAcademyLesson(id: string): Promise<void> {
  const db = getPrisma();
  await db.academyLesson.update({
    where: { id },
    data: {
      status: "published",
      publishedAt: new Date(),
    },
  });
}
