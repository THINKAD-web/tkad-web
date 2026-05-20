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
  const trendReport = await db.trendReport.findUnique({ where: { id } });
  if (!trendReport) return json({ error: "Not found" }, 404);
  return json({ trendReport });
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
  const existing = await db.trendReport.findUnique({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);

  const data: Prisma.TrendReportUpdateInput = {};

  if (typeof body.titleKo === "string") data.titleKo = body.titleKo.trim();
  if (typeof body.titleEn === "string" || body.titleEn === null) {
    data.titleEn =
      body.titleEn === null ? null : String(body.titleEn).trim() || null;
  }
  if (typeof body.contentKo === "string") data.contentKo = body.contentKo;
  const summaryKo = asStringArray(body.summaryKo);
  if (summaryKo) data.summaryKo = { set: summaryKo };
  const marketTrendKo = asStringArray(body.marketTrendKo);
  if (marketTrendKo) data.marketTrendKo = { set: marketTrendKo };
  const doohTrendKo = asStringArray(body.doohTrendKo);
  if (doohTrendKo) data.doohTrendKo = { set: doohTrendKo };
  if (body.verticalStrategies !== undefined) {
    data.verticalStrategies =
      body.verticalStrategies === null
        ? Prisma.JsonNull
        : (body.verticalStrategies as Prisma.InputJsonValue);
  }
  if (typeof body.thumbnailUrl === "string" || body.thumbnailUrl === null) {
    data.thumbnailUrl =
      body.thumbnailUrl === null
        ? null
        : String(body.thumbnailUrl).trim() || null;
  }
  if (typeof body.metaDescription === "string" || body.metaDescription === null) {
    data.metaDescription =
      body.metaDescription === null
        ? null
        : String(body.metaDescription).trim() || null;
  }
  const tags = asStringArray(body.tags);
  if (tags) data.tags = { set: tags };
  if (typeof body.slug === "string") data.slug = body.slug.trim();
  if (body.scheduledAt === null) data.scheduledAt = null;
  else if (typeof body.scheduledAt === "string") {
    data.scheduledAt = new Date(body.scheduledAt);
  }

  if (Object.keys(data).length === 0) {
    return json({ error: "No valid fields to update" }, 400);
  }

  const trendReport = await db.trendReport.update({
    where: { id },
    data,
  });
  return json({ trendReport });
}
