import { Prisma } from "@prisma/client";
import { generateGuideArticle } from "@/lib/content-auto/generators";
import { applySeoPackage } from "@/lib/content-auto/seo";
import { publishGuideArticle } from "@/lib/content-auto/seed-publish-helpers";
import { resolveModel } from "@/lib/ai-content-generator";
import { getPrisma } from "@/lib/prisma";
import { SEO_GUIDE_TOPICS } from "@/lib/seo-content/seo-guide-topics";

export type SeoGuideSeedResult = {
  slug: string;
  titleKo: string;
  status: "created" | "skipped" | "error";
  id?: string;
  published?: boolean;
  error?: string;
};

export async function runSeoGuideSeedPipeline(opts?: {
  publish?: boolean;
}): Promise<{
  results: SeoGuideSeedResult[];
  created: number;
  skipped: number;
  errors: number;
  published: number;
}> {
  const db = getPrisma();
  const publish = opts?.publish !== false;
  const results: SeoGuideSeedResult[] = [];

  for (const topic of SEO_GUIDE_TOPICS) {
    const existing = await db.guideArticle.findUnique({
      where: { slug: topic.slug },
    });
    if (existing) {
      if (publish && existing.status !== "published") {
        await publishGuideArticle(existing.id);
      }
      results.push({
        slug: topic.slug,
        titleKo: existing.titleKo,
        status: "skipped",
        id: existing.id,
        published: existing.status === "published" || publish,
      });
      continue;
    }

    try {
      const draft = await generateGuideArticle(
        `${topic.titleKo}\n\n타겟 키워드: ${topic.keywordsKo.join(", ")}`,
      );
      const seo = applySeoPackage({
        title: draft.titleKo,
        content: draft.contentKo,
        slugPrefix: "guide",
      });

      const saved = await db.guideArticle.create({
        data: {
          slug: topic.slug,
          status: publish ? "published" : "draft",
          titleKo: draft.titleKo || topic.titleKo,
          titleEn: draft.titleEn,
          excerptKo: draft.excerptKo,
          contentKo: seo.contentKo,
          metaDescription: seo.metaDescription,
          tags: [...new Set([...seo.tags, ...topic.keywordsKo])],
          topicKey: topic.topicKey,
          generationMethod: "auto",
          aiModel: resolveModel(),
          internalLinks: seo.internalLinks as Prisma.InputJsonValue,
          publishedAt: publish ? new Date() : null,
        },
      });

      results.push({
        slug: topic.slug,
        titleKo: saved.titleKo,
        status: "created",
        id: saved.id,
        published: publish,
      });
    } catch (e) {
      results.push({
        slug: topic.slug,
        titleKo: topic.titleKo,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
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
