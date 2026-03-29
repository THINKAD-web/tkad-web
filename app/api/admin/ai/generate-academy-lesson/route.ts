import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { generateAcademyLesson } from "@/lib/ai-content-generator";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: { courseTitle?: string; lessonTitle?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const courseTitle = String(body.courseTitle ?? "").trim();
  const lessonTitle = String(body.lessonTitle ?? "").trim();
  if (!courseTitle || !lessonTitle) {
    return json({ error: "courseTitle and lessonTitle are required" }, 400);
  }

  try {
    const g = await generateAcademyLesson(courseTitle, lessonTitle);
    const db = getPrisma();
    const saved = await db.academyLesson.create({
      data: {
        courseId: g.courseId,
        order: g.order,
        status: "draft",
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
        publishedAt: null,
      },
    });
    return json({ academyLesson: saved }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[admin/ai/generate-academy-lesson]", e);
    return json({ error: msg }, 500);
  }
}
