import { ReportCategory } from "@prisma/client";
import { metaFromContent } from "@/lib/content-auto/seo";
import { getPrisma } from "@/lib/prisma";

/** TrendReport 발행 시 public /report 목록용 Report row 동기화 */
export async function syncTrendReportToReportTable(trendReportId: string) {
  const db = getPrisma();
  const tr = await db.trendReport.findUnique({ where: { id: trendReportId } });
  if (!tr || tr.status !== "published") return null;

  const slug =
    tr.slug ??
    `trend-${(tr.month ?? "unknown").replace(/-/g, "")}-${tr.id.slice(-6)}`;
  const summary =
    tr.metaDescription ??
    metaFromContent(
      [tr.summaryKo.join(" "), tr.contentKo].filter(Boolean).join("\n"),
    );

  return db.report.upsert({
    where: { slug },
    create: {
      slug,
      title: tr.titleKo,
      summary,
      content: tr.contentKo,
      category: ReportCategory.TREND,
      thumbnail: tr.thumbnailUrl,
      published: true,
      publishedAt: tr.publishedAt ?? new Date(),
    },
    update: {
      title: tr.titleKo,
      summary,
      content: tr.contentKo,
      thumbnail: tr.thumbnailUrl,
      published: true,
      publishedAt: tr.publishedAt ?? new Date(),
    },
  });
}

/** slug 미설정 trend 발행 시 slug 자동 부여 */
export async function ensureTrendReportSlug(
  trendReportId: string,
): Promise<string> {
  const db = getPrisma();
  const tr = await db.trendReport.findUnique({ where: { id: trendReportId } });
  if (!tr) throw new Error("TrendReport not found");
  if (tr.slug) return tr.slug;

  const slug = `trend-${(tr.month ?? "unknown").replace(/-/g, "")}-${Date.now().toString(36)}`;
  await db.trendReport.update({
    where: { id: trendReportId },
    data: { slug },
  });
  return slug;
}
