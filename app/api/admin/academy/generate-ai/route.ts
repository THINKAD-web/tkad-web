import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { generateAcademyLesson } from "@/lib/ai-content-generator";
import {
  academyCategoryById,
  type AcademyCategoryId,
} from "@/lib/academy-admin-categories";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ProgressEvent =
  | { phase: "generating"; message: string }
  | { phase: "saving"; message: string }
  | { phase: "complete"; academyLesson: { id: string; titleKo: string } }
  | { phase: "error"; error: string };

function sseResponse(
  handler: (send: (event: ProgressEvent) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ProgressEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };
      try {
        await handler(send);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        send({ phase: "error", error: msg });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: {
    categoryId?: AcademyCategoryId;
    courseTitle?: string;
    lessonTitle?: string;
    stream?: boolean;
    lessonId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const category = body.categoryId
    ? academyCategoryById(body.categoryId)
    : undefined;
  const courseTitle =
    String(body.courseTitle ?? category?.courseTitle ?? "").trim();
  const lessonTitle =
    String(body.lessonTitle ?? category?.lessonTopic ?? "").trim();

  if (!courseTitle || !lessonTitle) {
    return json(
      { error: "categoryId 또는 courseTitle·lessonTitle 이 필요합니다." },
      400,
    );
  }

  const lessonId =
    typeof body.lessonId === "string" && body.lessonId.trim()
      ? body.lessonId.trim()
      : undefined;
  const useStream = body.stream !== false;

  const run = async (send?: (e: ProgressEvent) => void) => {
    send?.({
      phase: "generating",
      message: "Claude로 아카데미 아티클 초안 작성 중…",
    });
    const g = await generateAcademyLesson(courseTitle, lessonTitle);
    send?.({ phase: "saving", message: "초안 저장 중…" });
    const db = getPrisma();
    const data = {
      courseId: g.courseId,
      order: g.order,
      status: "draft" as const,
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
    };
    const saved = lessonId
      ? await db.academyLesson.update({ where: { id: lessonId }, data })
      : await db.academyLesson.create({ data });
    const complete: ProgressEvent = {
      phase: "complete",
      academyLesson: { id: saved.id, titleKo: saved.titleKo },
    };
    send?.(complete);
    return complete;
  };

  if (!useStream) {
    try {
      const result = await run();
      return json({ academyLesson: result.academyLesson }, 201);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("ANTHROPIC_API_KEY")) {
        return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
      }
      console.error("[admin/academy/generate-ai]", e);
      return json({ error: msg }, 500);
    }
  }

  return sseResponse(async (send) => {
    try {
      await run(send);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("ANTHROPIC_API_KEY")) {
        send({ phase: "error", error: "AI 미설정: ANTHROPIC_API_KEY" });
        return;
      }
      console.error("[admin/academy/generate-ai stream]", e);
      send({ phase: "error", error: msg });
    }
  });
}
