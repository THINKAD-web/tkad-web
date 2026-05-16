import type { AcademyArticleCategory, Prisma } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { ACADEMY_CATEGORY_ORDER } from "@/lib/academy-article-category";
import {
  getDemoAcademyArticleBySlug,
  listDemoAcademyArticles,
} from "@/lib/academy-article-demo-data";
import { estimateAcademyReadMinutes } from "@/lib/academy-markdown";

export function parseAcademyCategoryParam(
  raw: string | null | undefined,
): AcademyArticleCategory | null {
  if (!raw) return null;
  const v = raw.toUpperCase();
  return ACADEMY_CATEGORY_ORDER.includes(v as AcademyArticleCategory)
    ? (v as AcademyArticleCategory)
    : null;
}

export type PublishedAcademyListRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: AcademyArticleCategory;
  thumbnail: string | null;
  publishedAt: Date | null;
  tags: string[];
  readMinutes: number;
};

function mapListRow(r: {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: AcademyArticleCategory;
  thumbnail: string | null;
  publishedAt: Date | null;
  tags: string[];
  content?: string;
}): PublishedAcademyListRow {
  const body = r.content?.trim() ? r.content : r.summary;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    category: r.category,
    thumbnail: r.thumbnail,
    publishedAt: r.publishedAt,
    tags: r.tags,
    readMinutes: estimateAcademyReadMinutes(body),
  };
}

export async function listPublishedAcademyArticles(opts: {
  category?: AcademyArticleCategory | null;
  page?: number;
  pageSize?: number;
}): Promise<{
  articles: PublishedAcademyListRow[];
  total: number;
  page: number;
  pageSize: number;
  usingDemo: boolean;
}> {
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
  const page = Math.max(1, opts.page ?? 1);

  if (!isDatabaseConfigured()) {
    const demo = listDemoAcademyArticles({ ...opts, page, pageSize });
    return {
      articles: demo.articles.map((r) => mapListRow(r)),
      total: demo.total,
      page: demo.page,
      pageSize: demo.pageSize,
      usingDemo: true,
    };
  }

  const where: Prisma.AcademyArticleWhereInput = {
    published: true,
    ...(opts.category ? { category: opts.category } : {}),
  };

  const db = getPrisma();
  const [total, rows] = await Promise.all([
    db.academyArticle.count({ where }),
    db.academyArticle.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        content: true,
        category: true,
        thumbnail: true,
        publishedAt: true,
        tags: true,
      },
    }),
  ]);

  if (total === 0 && page === 1) {
    const demo = listDemoAcademyArticles({ ...opts, page, pageSize });
    return {
      articles: demo.articles.map((r) => mapListRow(r)),
      total: demo.total,
      page: demo.page,
      pageSize: demo.pageSize,
      usingDemo: true,
    };
  }

  return {
    articles: rows.map((r) => mapListRow(r)),
    total,
    page,
    pageSize,
    usingDemo: false,
  };
}

export async function getPublishedAcademyArticleBySlug(slug: string) {
  if (!isDatabaseConfigured()) {
    return getDemoAcademyArticleBySlug(slug);
  }
  const db = getPrisma();
  const row = await db.academyArticle.findFirst({
    where: { slug, published: true },
  });
  if (row) return row;
  return getDemoAcademyArticleBySlug(slug);
}
