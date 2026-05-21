import { runTrendReportDraftPipeline } from "@/lib/insights/trend-report-pipeline";
import { inferTrendReportCategory } from "@/lib/content-auto/trend-report-category";
import { publishTrendReportRow } from "@/lib/content-auto/seed-publish-helpers";
import { getPrisma } from "@/lib/prisma";
import { TREND_SEED_TOPICS } from "@/lib/content-auto/trend-seed-topics";

const SEED_MONTH = "2026-05";

export type TrendSeedResult = {
  slug: string;
  titleKo: string;
  status: "created" | "skipped" | "error";
  id?: string;
  published?: boolean;
  category?: string;
  error?: string;
};

export type TrendSeedOptions = {
  /** true면 생성 후 즉시 published + Report 테이블 동기화 */
  publish?: boolean;
};

/**
 * 트렌드 리포트 초안 5건 생성 (옵션: 즉시 발행).
 * `TrendReport.month` unique 충돌 방지를 위해 DB month 필드는 null.
 */
export async function runTrendReportSeedPipeline(
  opts?: TrendSeedOptions,
): Promise<{
  results: TrendSeedResult[];
  created: number;
  skipped: number;
  errors: number;
  published: number;
}> {
  const db = getPrisma();
  const results: TrendSeedResult[] = [];
  const publish = opts?.publish === true;

  for (const topic of TREND_SEED_TOPICS) {
    const existing = await db.trendReport.findUnique({
      where: { slug: topic.slug },
    });
    if (existing) {
      let didPublish = false;
      if (publish && existing.status !== "published") {
        try {
          const cat = inferTrendReportCategory({
            slug: topic.slug,
            topicFocus: topic.topicFocus,
            titleKo: topic.titleKo,
          });
          await publishTrendReportRow(existing.id, cat);
          didPublish = true;
        } catch {
          /* keep skipped */
        }
      }
      results.push({
        slug: topic.slug,
        titleKo: topic.titleKo,
        status: "skipped",
        id: existing.id,
        published: existing.status === "published" || didPublish,
        category: inferTrendReportCategory({
          slug: topic.slug,
          topicFocus: topic.topicFocus,
          titleKo: topic.titleKo,
        }),
      });
      continue;
    }

    try {
      const complete = await runTrendReportDraftPipeline({
        month: SEED_MONTH,
        slug: topic.slug,
        generationMethod: "auto",
        monthField: null,
        topicFocus: topic.topicFocus,
        titleKoHint: topic.titleKo,
      });
      const id = complete.trendReport.id;
      let published = false;
      const category = inferTrendReportCategory({
        slug: topic.slug,
        topicFocus: topic.topicFocus,
        titleKo: topic.titleKo,
      });

      if (publish) {
        await publishTrendReportRow(id, category);
        published = true;
      }

      results.push({
        slug: topic.slug,
        titleKo: complete.trendReport.titleKo,
        status: "created",
        id,
        published,
        category,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({
        slug: topic.slug,
        titleKo: topic.titleKo,
        status: "error",
        error: msg,
      });
    }
  }

  return {
    results,
    created: results.filter((r) => r.status === "created").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    published: results.filter((r) => r.published).length,
  };
}
