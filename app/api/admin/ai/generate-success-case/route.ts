import { NextRequest } from "next/server";
import { generateSuccessCase } from "@/lib/ai-content-generator";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: {
    clientName?: string;
    industry?: string;
    mediaUsed?: unknown;
    metrics?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const clientName = String(body.clientName ?? "").trim();
  const industry = String(body.industry ?? "").trim();
  const mediaUsed = Array.isArray(body.mediaUsed)
    ? body.mediaUsed.filter((x): x is string => typeof x === "string")
    : [];
  const metrics =
    body.metrics &&
    typeof body.metrics === "object" &&
    !Array.isArray(body.metrics)
      ? (body.metrics as Record<string, unknown>)
      : {};

  if (!clientName || !industry || mediaUsed.length === 0) {
    return json(
      { error: "clientName, industry, and non-empty mediaUsed[] required" },
      400,
    );
  }

  try {
    const g = await generateSuccessCase(
      clientName,
      industry,
      mediaUsed,
      metrics,
    );
    const db = getPrisma();
    const saved = await db.successCase.create({
      data: {
        campaignId: null,
        status: "draft",
        clientName: g.clientName,
        industry: g.industry,
        titleKo: g.titleKo,
        titleEn: g.titleEn,
        summaryKo: g.summaryKo,
        challengeKo: g.challengeKo,
        solutionKo: g.solutionKo,
        resultsKo: g.resultsKo,
        metricsJson: g.metricsJson ?? undefined,
        mediaUsed: g.mediaUsed,
        periodStart: g.periodStart,
        periodEnd: g.periodEnd,
        thumbnailUrl: g.thumbnailUrl,
        galleryUrls: g.galleryUrls ?? [],
        testimonialKo: g.testimonialKo,
        publishedAt: null,
      },
    });
    return json({ successCase: saved }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[admin/ai/generate-success-case]", e);
    return json({ error: msg }, 500);
  }
}
