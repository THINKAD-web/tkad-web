import { Prisma } from "@prisma/client";
import {
  generateEducationArticle,
  generateGuideArticle,
} from "@/lib/content-auto/generators";
import { applySeoPackage } from "@/lib/content-auto/seo";
import {
  EDUCATION_TOPIC_POOL,
  GUIDE_TOPIC_POOL,
  pickTopicByWeek,
} from "@/lib/content-auto/topic-pools";
import {
  runTrendReportDraftPipeline,
  type TrendReportPipelineEvent,
} from "@/lib/insights/trend-report-pipeline";
import { resolveModel } from "@/lib/ai-content-generator";
import { getPrisma } from "@/lib/prisma";

export type ArticlePipelineResult = {
  id: string;
  slug: string;
  titleKo: string;
  kind: "education_article" | "guide_article";
};

function seoulDateKey(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function buildEducationSlug(date = new Date()): string {
  return `education-${seoulDateKey(date)}`;
}

export function buildGuideSlug(date = new Date()): string {
  return `guide-${seoulDateKey(date)}`;
}

/** 매월 1일·15일 idempotent slug */
export function buildBiMonthlyTrendSlug(month: string, day: number): string {
  const half = day <= 14 ? "h1" : "h2";
  return `monthly-${month}-${half}`;
}

export async function runEducationDraftPipeline(opts?: {
  topicKey?: string;
  slug?: string;
  reportId?: string;
}): Promise<ArticlePipelineResult> {
  const topic =
    EDUCATION_TOPIC_POOL.find((t) => t.key === opts?.topicKey) ??
    pickTopicByWeek(EDUCATION_TOPIC_POOL);
  const slug = opts?.slug ?? buildEducationSlug();
  const db = getPrisma();

  const existing = await db.educationArticle.findUnique({ where: { slug } });
  if (existing && !opts?.reportId) {
    return {
      id: existing.id,
      slug: existing.slug,
      titleKo: existing.titleKo,
      kind: "education_article",
    };
  }

  const draft = await generateEducationArticle(topic.title);
  const seo = applySeoPackage({
    title: draft.titleKo,
    content: draft.contentKo,
    slugPrefix: "edu",
  });

  const data = {
    slug,
    status: "draft" as const,
    titleKo: draft.titleKo,
    titleEn: draft.titleEn,
    excerptKo: draft.excerptKo,
    contentKo: seo.contentKo,
    metaDescription: seo.metaDescription,
    tags: seo.tags,
    topicKey: topic.key,
    generationMethod: "auto" as const,
    aiModel: resolveModel(),
    internalLinks: seo.internalLinks as Prisma.InputJsonValue,
    publishedAt: null,
  };

  const saved = opts?.reportId
    ? await db.educationArticle.update({ where: { id: opts.reportId }, data })
    : await db.educationArticle.create({ data: { ...data, slug } });

  return {
    id: saved.id,
    slug: saved.slug,
    titleKo: saved.titleKo,
    kind: "education_article",
  };
}

export async function runGuideDraftPipeline(opts?: {
  topicKey?: string;
  slug?: string;
  reportId?: string;
}): Promise<ArticlePipelineResult> {
  const topic =
    GUIDE_TOPIC_POOL.find((t) => t.key === opts?.topicKey) ??
    pickTopicByWeek(GUIDE_TOPIC_POOL, 1);
  const slug = opts?.slug ?? buildGuideSlug();
  const db = getPrisma();

  const existing = await db.guideArticle.findUnique({ where: { slug } });
  if (existing && !opts?.reportId) {
    return {
      id: existing.id,
      slug: existing.slug,
      titleKo: existing.titleKo,
      kind: "guide_article",
    };
  }

  const draft = await generateGuideArticle(topic.title);
  const seo = applySeoPackage({
    title: draft.titleKo,
    content: draft.contentKo,
    slugPrefix: "guide",
  });

  const data = {
    slug,
    status: "draft" as const,
    titleKo: draft.titleKo,
    titleEn: draft.titleEn,
    excerptKo: draft.excerptKo,
    contentKo: seo.contentKo,
    metaDescription: seo.metaDescription,
    tags: seo.tags,
    topicKey: topic.key,
    generationMethod: "auto" as const,
    aiModel: resolveModel(),
    internalLinks: seo.internalLinks as Prisma.InputJsonValue,
    publishedAt: null,
  };

  const saved = opts?.reportId
    ? await db.guideArticle.update({ where: { id: opts.reportId }, data })
    : await db.guideArticle.create({ data: { ...data, slug } });

  return {
    id: saved.id,
    slug: saved.slug,
    titleKo: saved.titleKo,
    kind: "guide_article",
  };
}

export async function runBiMonthlyTrendPipeline(opts: {
  month: string;
  slug: string;
  reportId?: string;
}): Promise<TrendReportPipelineEvent & { phase: "complete" }> {
  return runTrendReportDraftPipeline({
    month: opts.month,
    slug: opts.slug,
    reportId: opts.reportId,
    generationMethod: "auto",
    monthField: opts.month,
  });
}
