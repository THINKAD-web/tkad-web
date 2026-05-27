import type { ReportCategory } from "@prisma/client";
import {
  REPORT_SEED_SYSTEM,
  REPORT_SEED_TOPICS,
} from "@/lib/content-auto/report-seed-topics";
import {
  extractBulletLines,
  extractSummaryLines,
} from "@/lib/content-auto/seed-content-parse";
import {
  generateSeedText,
  resolveSeedModel,
  withSeedDelay,
} from "@/lib/content-auto/seed-claude-direct";
import { publishTrendReportRow } from "@/lib/content-auto/seed-publish-helpers";
import { getPrisma } from "@/lib/prisma";

export type ReportSeedItemResult = {
  slug: string;
  title: string;
  status: "created" | "skipped" | "error";
  id?: string;
  href?: string;
  category?: ReportCategory;
  error?: string;
};

export async function runReportSeedBatch(): Promise<{
  results: ReportSeedItemResult[];
  created: number;
  skipped: number;
  errors: number;
}> {
  const db = getPrisma();
  const model = resolveSeedModel();
  const results: ReportSeedItemResult[] = [];

  for (let i = 0; i < REPORT_SEED_TOPICS.length; i++) {
    const topic = REPORT_SEED_TOPICS[i];

    const existing = await db.trendReport.findUnique({
      where: { slug: topic.slug },
    });
    if (existing) {
      results.push({
        slug: topic.slug,
        title: topic.title,
        status: "skipped",
        id: existing.id,
        href: existing.slug ? `/ko/report/${existing.slug}` : undefined,
        category: topic.category,
      });
      continue;
    }

    try {
      const content = await withSeedDelay(i, () =>
        generateSeedText({
          system: REPORT_SEED_SYSTEM,
          user: `다음 주제로 리포트 작성: ${topic.title}
키워드: ${topic.keywords.join(", ")}
분량: 1000자 이상`,
          maxTokens: 2000,
        }),
      );

      const summaryKo = extractSummaryLines(content, 3);
      const bullets = extractBulletLines(content, 8);
      const marketTrendKo =
        bullets.length >= 3
          ? bullets.slice(0, 4)
          : topic.keywords.map((k) => `${k} — 2026년 국내 OOH 시장에서 주목`);
      const doohTrendKo =
        bullets.length >= 5
          ? bullets.slice(4, 8)
          : topic.keywords
              .filter((k) => /dooh|디지털|프로그래매틱/i.test(k))
              .map((k) => `${k} 채널 확대 및 측정 고도화`);

      const row = await db.trendReport.create({
        data: {
          slug: topic.slug,
          month: null,
          status: "draft",
          titleKo: topic.title,
          contentKo: content,
          summaryKo,
          marketTrendKo,
          doohTrendKo:
            doohTrendKo.length > 0
              ? doohTrendKo
              : ["DOOH·디지털 옥외 비중 확대", "데이터 기반 집행 수요 증가"],
          generationMethod: "auto",
          aiModel: model,
          tags: topic.keywords,
          metaDescription: summaryKo.join(" ").slice(0, 300),
        },
      });

      const { slug } = await publishTrendReportRow(row.id, topic.category);

      results.push({
        slug: topic.slug,
        title: topic.title,
        status: "created",
        id: row.id,
        href: `/ko/report/${slug}`,
        category: topic.category,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[seed/reports]", topic.slug, msg);
      results.push({
        slug: topic.slug,
        title: topic.title,
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
  };
}
