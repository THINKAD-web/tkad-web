import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  runEducationDraftPipeline,
  runGuideDraftPipeline,
  runBiMonthlyTrendPipeline,
} from "@/lib/content-auto/pipelines";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let body: { kind?: string } = {};
  try {
    body = await request.json();
  } catch {
    // kind from query fallback
  }
  const kind =
    body.kind ??
    new URL(request.url).searchParams.get("type") ??
    new URL(request.url).searchParams.get("kind");

  const db = getPrisma();

  if (kind === "trend_report") {
    const tr = await db.trendReport.findUnique({ where: { id } });
    if (!tr) return json({ error: "Not found" }, 404);
    const month = tr.month ?? new Date().toISOString().slice(0, 7);
    const result = await runBiMonthlyTrendPipeline({
      month,
      slug: tr.slug ?? `trend-regen-${id.slice(-6)}`,
      reportId: id,
    });
    return json({ kind: "trend_report", content: result.trendReport });
  }

  if (kind === "education_article") {
    const row = await db.educationArticle.findUnique({ where: { id } });
    if (!row) return json({ error: "Not found" }, 404);
    const result = await runEducationDraftPipeline({
      topicKey: row.topicKey ?? undefined,
      slug: row.slug,
      reportId: id,
    });
    return json({ kind: "education_article", content: result });
  }

  if (kind === "guide_article") {
    const row = await db.guideArticle.findUnique({ where: { id } });
    if (!row) return json({ error: "Not found" }, 404);
    const result = await runGuideDraftPipeline({
      topicKey: row.topicKey ?? undefined,
      slug: row.slug,
      reportId: id,
    });
    return json({ kind: "guide_article", content: result });
  }

  return json({ error: "kind required (trend_report|education_article|guide_article)" }, 400);
}
