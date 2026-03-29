import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === "string");
  return out.length === v.length ? out : undefined;
}

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  const academyLesson = await db.academyLesson.findUnique({ where: { id } });
  if (!academyLesson) return json({ error: "Not found" }, 404);
  return json({ academyLesson });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const db = getPrisma();
  const existing = await db.academyLesson.findUnique({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);

  const data: Prisma.AcademyLessonUpdateInput = {};

  if (typeof body.titleKo === "string") data.titleKo = body.titleKo.trim();
  if (typeof body.titleEn === "string" || body.titleEn === null) {
    data.titleEn =
      body.titleEn === null ? null : String(body.titleEn).trim() || null;
  }
  if (typeof body.descriptionKo === "string") {
    data.descriptionKo = body.descriptionKo.trim();
  }
  const objectivesKo = asStringArray(body.objectivesKo);
  if (objectivesKo) data.objectivesKo = { set: objectivesKo };
  if (body.chapters !== undefined) {
    if (!Array.isArray(body.chapters)) {
      return json({ error: "chapters must be an array" }, 400);
    }
    data.chapters = body.chapters as Prisma.InputJsonValue;
  }
  if (body.quizzes !== undefined) {
    data.quizzes =
      body.quizzes === null
        ? Prisma.JsonNull
        : (body.quizzes as Prisma.InputJsonValue);
  }
  if (body.durationMin != null) {
    const n = Number(body.durationMin);
    if (Number.isFinite(n)) data.durationMin = Math.max(5, Math.round(n));
  }
  if (typeof body.thumbnailUrl === "string" || body.thumbnailUrl === null) {
    data.thumbnailUrl =
      body.thumbnailUrl === null
        ? null
        : String(body.thumbnailUrl).trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return json({ error: "No valid fields to update" }, 400);
  }

  const academyLesson = await db.academyLesson.update({
    where: { id },
    data,
  });
  return json({ academyLesson });
}
