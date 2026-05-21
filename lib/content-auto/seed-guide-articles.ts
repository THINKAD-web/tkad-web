import { Prisma } from "@prisma/client";
import { generateGuideArticle } from "@/lib/content-auto/generators";
import { applySeoPackage } from "@/lib/content-auto/seo";
import { publishGuideArticle } from "@/lib/content-auto/seed-publish-helpers";
import { GUIDE_SEED_TOPICS } from "@/lib/content-auto/guide-seed-topics";
import { resolveModel } from "@/lib/ai-content-generator";
import { getPrisma } from "@/lib/prisma";

export type GuideSeedResult = {
  slug: string;
  titleKo: string;
  status: "created" | "skipped" | "error";
  id?: string;
  published?: boolean;
  error?: string;
};

export async function runGuideArticleSeedPipeline(opts?: {
  publish?: boolean;
}): Promise<{
  results: GuideSeedResult[];
  created: number;
  skipped: number;
  errors: number;
  published: number;
}> {
  const db = getPrisma();
  const publish = opts?.publish === true;
  const results: GuideSeedResult[] = [];

  for (const topic of GUIDE_SEED_TOPICS) {
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
      const draft = await generateGuideArticle(topic.titleKo);
      const seo = applySeoPackage({
        title: draft.titleKo,
        content: draft.contentKo,
        slugPrefix: "guide",
      });

      const saved = await db.guideArticle.create({
        data: {
          slug: topic.slug,
          status: publish ? "published" : "draft",
          titleKo: draft.titleKo,
          titleEn: draft.titleEn,
          excerptKo: draft.excerptKo,
          contentKo: seo.contentKo,
          metaDescription: seo.metaDescription,
          tags: seo.tags,
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
