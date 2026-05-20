import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  const row = await db.guideArticle.findUnique({ where: { id } });
  if (!row) return json({ error: "Not found" }, 404);
  return json({ guideArticle: row });
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
  const existing = await db.guideArticle.findUnique({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);

  const data: Record<string, unknown> = {};
  if (typeof body.titleKo === "string") data.titleKo = body.titleKo.trim();
  if (typeof body.titleEn === "string" || body.titleEn === null) {
    data.titleEn =
      body.titleEn === null ? null : String(body.titleEn).trim() || null;
  }
  if (typeof body.excerptKo === "string") data.excerptKo = body.excerptKo;
  if (typeof body.contentKo === "string") data.contentKo = body.contentKo;
  if (typeof body.metaDescription === "string" || body.metaDescription === null) {
    data.metaDescription =
      body.metaDescription === null
        ? null
        : String(body.metaDescription).trim() || null;
  }
  if (Array.isArray(body.tags)) {
    data.tags = body.tags.filter((t): t is string => typeof t === "string");
  }
  if (typeof body.thumbnailUrl === "string" || body.thumbnailUrl === null) {
    data.thumbnailUrl =
      body.thumbnailUrl === null
        ? null
        : String(body.thumbnailUrl).trim() || null;
  }
  if (typeof body.slug === "string") data.slug = body.slug.trim();
  if (body.scheduledAt === null) data.scheduledAt = null;
  else if (typeof body.scheduledAt === "string") {
    data.scheduledAt = new Date(body.scheduledAt);
  }

  if (Object.keys(data).length === 0) {
    return json({ error: "No valid fields to update" }, 400);
  }

  const guideArticle = await db.guideArticle.update({
    where: { id },
    data,
  });
  return json({ guideArticle });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  await db.guideArticle.delete({ where: { id } });
  return json({ ok: true });
}
