import { getLatestPublishedSuccessCases } from "@/lib/public-content-queries";
import { formatCaseStudyMetricValue } from "@/lib/campaign-case-study";
import { cleanSummary } from "@/lib/content-card-visuals";

export type HomeCaseItem = {
  id: string;
  slug?: string;
  brandName?: string;
  title?: string;
  thumbnailUrl?: string;
  industry?: string;
  summary?: string;
};

export async function fetchPublishedCases({
  limit,
  locale = "ko",
}: {
  limit: number;
  locale?: string;
}): Promise<HomeCaseItem[]> {
  try {
    const rows = await getLatestPublishedSuccessCases(locale, limit);
    return rows.map((row) => {
      const metric = row.highlightMetrics[0];
      const rawSummary = metric
        ? formatCaseStudyMetricValue(metric, locale)
        : row.summaryKo;
      const summary = rawSummary ? cleanSummary(rawSummary) : undefined;

      return {
        id: row.id,
        slug: row.id,
        brandName: row.clientName,
        title: row.titleKo,
        thumbnailUrl: row.thumbnailUrl ?? undefined,
        industry: row.industry,
        summary,
      };
    });
  } catch {
    return [];
  }
}
