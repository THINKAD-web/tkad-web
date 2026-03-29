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
  const successCase = await db.successCase.findUnique({ where: { id } });
  if (!successCase) return json({ error: "Not found" }, 404);
  return json({ successCase });
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
  const existing = await db.successCase.findUnique({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);

  const data: Prisma.SuccessCaseUpdateInput = {};

  if (typeof body.clientName === "string")
    data.clientName = body.clientName.trim();
  if (typeof body.industry === "string") data.industry = body.industry.trim();
  if (typeof body.titleKo === "string") data.titleKo = body.titleKo.trim();
  if (typeof body.titleEn === "string" || body.titleEn === null) {
    data.titleEn =
      body.titleEn === null ? null : String(body.titleEn).trim() || null;
  }
  if (typeof body.summaryKo === "string")
    data.summaryKo = body.summaryKo.trim();
  if (typeof body.challengeKo === "string")
    data.challengeKo = body.challengeKo.trim();
  if (typeof body.solutionKo === "string")
    data.solutionKo = body.solutionKo.trim();
  const resultsKo = asStringArray(body.resultsKo);
  if (resultsKo) data.resultsKo = { set: resultsKo };
  if (body.metricsJson !== undefined) {
    data.metricsJson =
      body.metricsJson === null
        ? Prisma.JsonNull
        : (body.metricsJson as Prisma.InputJsonValue);
  }
  const mediaUsed = asStringArray(body.mediaUsed);
  if (mediaUsed) data.mediaUsed = { set: mediaUsed };
  if (body.periodStart !== undefined) {
    data.periodStart = body.periodStart
      ? new Date(String(body.periodStart))
      : null;
  }
  if (body.periodEnd !== undefined) {
    data.periodEnd = body.periodEnd ? new Date(String(body.periodEnd)) : null;
  }
  if (typeof body.thumbnailUrl === "string" || body.thumbnailUrl === null) {
    data.thumbnailUrl =
      body.thumbnailUrl === null
        ? null
        : String(body.thumbnailUrl).trim() || null;
  }
  const galleryUrls = asStringArray(body.galleryUrls);
  if (galleryUrls) data.galleryUrls = { set: galleryUrls };
  if (typeof body.testimonialKo === "string" || body.testimonialKo === null) {
    data.testimonialKo =
      body.testimonialKo === null
        ? null
        : String(body.testimonialKo).trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return json({ error: "No valid fields to update" }, 400);
  }

  const successCase = await db.successCase.update({
    where: { id },
    data,
  });
  return json({ successCase });
}
