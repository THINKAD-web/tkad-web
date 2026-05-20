import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import {
  buildEducationSlug,
  runEducationDraftPipeline,
} from "@/lib/content-auto/pipelines";
import {
  notifyContentDraftReady,
  notifyPipelineError,
} from "@/lib/insights/notifiers/slack";
import { json } from "@/lib/admin-guard";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const h = request.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

/** Vercel Cron — 매주 월요일 00:00 UTC (09:00 KST) 교육 콘텐츠 초안 */
export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!isDatabaseConfigured()) {
    return json({ error: "Database not configured" }, 503);
  }

  const slug = buildEducationSlug();
  const startedAt = Date.now();

  try {
    const result = await runEducationDraftPipeline({ slug });

    void notifyContentDraftReady({
      kind: "education_article",
      id: result.id,
      titleKo: result.titleKo,
    });

    return json(
      {
        ok: true,
        slug: result.slug,
        id: result.id,
        elapsedMs: Date.now() - startedAt,
        message: "education draft created",
      },
      201,
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return json({ error: "duplicate-slug", slug }, 409);
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[cron/generate-academy-content]", msg);
    void notifyPipelineError("education-generate", msg, { slug });
    return json({ error: msg, slug }, 500);
  }
}
