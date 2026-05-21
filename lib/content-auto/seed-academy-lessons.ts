import { Prisma } from "@prisma/client";
import { generateAcademyLesson } from "@/lib/ai-content-generator";
import { publishAcademyLesson } from "@/lib/content-auto/seed-publish-helpers";
import { ACADEMY_SEED_TOPICS } from "@/lib/content-auto/academy-seed-topics";
import { getPrisma } from "@/lib/prisma";

export type AcademySeedResult = {
  courseId: string;
  titleKo: string;
  status: "created" | "skipped" | "error";
  id?: string;
  published?: boolean;
  error?: string;
};

export async function runAcademyLessonSeedPipeline(opts?: {
  publish?: boolean;
}): Promise<{
  results: AcademySeedResult[];
  created: number;
  skipped: number;
  errors: number;
  published: number;
}> {
  const db = getPrisma();
  const publish = opts?.publish === true;
  const results: AcademySeedResult[] = [];

  for (const topic of ACADEMY_SEED_TOPICS) {
    const existing = await db.academyLesson.findFirst({
      where: {
        courseId: topic.courseId,
        titleKo: topic.lessonTitleKo,
      },
    });
    if (existing) {
      if (publish && existing.status !== "published") {
        await publishAcademyLesson(existing.id);
      }
      results.push({
        courseId: topic.courseId,
        titleKo: existing.titleKo,
        status: "skipped",
        id: existing.id,
        published: existing.status === "published" || publish,
      });
      continue;
    }

    try {
      const g = await generateAcademyLesson(
        topic.courseTitle,
        topic.lessonTitleKo,
      );
      const saved = await db.academyLesson.create({
        data: {
          courseId: topic.courseId,
          order: topic.order,
          status: publish ? "published" : "draft",
          titleKo: g.titleKo,
          titleEn: g.titleEn,
          descriptionKo: g.descriptionKo,
          objectivesKo: g.objectivesKo,
          chapters: g.chapters as Prisma.InputJsonValue,
          quizzes:
            g.quizzes === null || g.quizzes === undefined
              ? undefined
              : (g.quizzes as Prisma.InputJsonValue),
          durationMin: g.durationMin,
          thumbnailUrl: g.thumbnailUrl,
          publishedAt: publish ? new Date() : null,
        },
      });

      results.push({
        courseId: topic.courseId,
        titleKo: saved.titleKo,
        status: "created",
        id: saved.id,
        published: publish,
      });
    } catch (e) {
      results.push({
        courseId: topic.courseId,
        titleKo: topic.lessonTitleKo,
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
