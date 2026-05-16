import type { AcademyArticleCategory } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { DEMO_ACADEMY_ARTICLES } from "@/lib/academy-article-demo-data";

export type RelatedAcademyRow = {
  slug: string;
  title: string;
  summary: string;
  category: AcademyArticleCategory;
  publishedAt: Date | null;
  thumbnail: string | null;
};

export async function listRelatedAcademyArticles(
  slug: string,
  category: AcademyArticleCategory,
  limit = 3,
): Promise<RelatedAcademyRow[]> {
  if (!isDatabaseConfigured()) {
    return DEMO_ACADEMY_ARTICLES.filter((r) => r.slug !== slug)
      .sort((a, b) => {
        const score = (x: (typeof DEMO_ACADEMY_ARTICLES)[number]) =>
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
  const same = await db.academyArticle.findMany({
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
  const fill = await db.academyArticle.findMany({
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
