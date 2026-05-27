import { Prisma } from "@prisma/client";
import {
  ACADEMY_SEED_SYSTEM,
  ACADEMY_SEED_TOPICS_V2,
} from "@/lib/content-auto/academy-seed-topics-v2";
import {
  extractBulletLines,
  extractSummaryLines,
  splitMarkdownSections,
} from "@/lib/content-auto/seed-content-parse";
import {
  generateSeedText,
  resolveSeedModel,
  withSeedDelay,
} from "@/lib/content-auto/seed-claude-direct";
import { getPrisma } from "@/lib/prisma";

export type AcademySeedItemResult = {
  slug: string;
  title: string;
  status: "created" | "skipped" | "error";
  id?: string;
  href?: string;
  error?: string;
};

function chaptersFromContent(content: string): Prisma.InputJsonValue {
  const sections = splitMarkdownSections(content);
  const chapters = sections.map((s) => ({
    title: s.title,
    content: s.content,
  }));
  if (chapters.length >= 4) return chapters as Prisma.InputJsonValue;

  const fallback = splitMarkdownSections(
    `## 도입\n${content.slice(0, Math.min(800, content.length))}\n\n## 핵심\n${content.slice(800, 1600) || content}`,
  );
  return fallback.map((s) => ({
    title: s.title,
    content: s.content,
  })) as Prisma.InputJsonValue;
}

export async function runAcademySeedBatch(): Promise<{
  results: AcademySeedItemResult[];
  created: number;
  skipped: number;
  errors: number;
}> {
  const db = getPrisma();
  const model = resolveSeedModel();
  const results: AcademySeedItemResult[] = [];

  for (let i = 0; i < ACADEMY_SEED_TOPICS_V2.length; i++) {
    const topic = ACADEMY_SEED_TOPICS_V2[i];

    const existing = await db.academyLesson.findFirst({
      where: { courseId: topic.courseId, titleKo: topic.title },
    });
    if (existing) {
      results.push({
        slug: topic.slug,
        title: topic.title,
        status: "skipped",
        id: existing.id,
        href: `/ko/academy`,
      });
      continue;
    }

    try {
      const content = await withSeedDelay(i, () =>
        generateSeedText({
          system: ACADEMY_SEED_SYSTEM,
          user: `다음 주제로 교육 콘텐츠 작성:
제목: ${topic.title}
카테고리: ${topic.category}
난이도: ${topic.level}
대상: ${topic.targetAudience}
분량: 1000자 이상`,
          maxTokens: 2000,
        }),
      );

      const objectivesKo = extractSummaryLines(content, 5);
      const tipBullets = extractBulletLines(content, 5);
      const descriptionKo =
        content
          .split("\n")
          .map((l) => l.trim())
          .find((l) => l.length > 40 && !/^#/.test(l)) ??
        `${topic.targetAudience}를 위한 ${topic.level} 과정`;

      const chapters = chaptersFromContent(content);
      const now = new Date();

      const row = await db.academyLesson.create({
        data: {
          courseId: topic.courseId,
          order: topic.order,
          status: "published",
          titleKo: topic.title,
          descriptionKo: descriptionKo.slice(0, 2000),
          objectivesKo:
            tipBullets.length >= 3
              ? tipBullets.slice(0, 5)
              : objectivesKo,
          chapters,
          durationMin: topic.level === "중급" ? 35 : 25,
          publishedAt: now,
        },
      });

      results.push({
        slug: topic.slug,
        title: topic.title,
        status: "created",
        id: row.id,
        href: `/ko/academy`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[seed/academy]", topic.slug, msg);
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
