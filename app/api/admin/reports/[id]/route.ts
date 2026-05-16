import { NextRequest } from "next/server";
import type { ReportCategory } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { REPORT_CATEGORY_ORDER } from "@/lib/report-category";

export const dynamic = "force-dynamic";

function parseCategory(raw: string | undefined): ReportCategory | null {
  if (!raw) return null;
  const v = raw.toUpperCase() as ReportCategory;
  return REPORT_CATEGORY_ORDER.includes(v) ? v : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const body = (await request.json()) as {
    slug?: string;
    title?: string;
    summary?: string;
    content?: string;
    category?: string;
    tags?: string[];
    thumbnail?: string | null;
    published?: boolean;
    publishedAt?: string | null;
  };

  const data: Record<string, unknown> = {};
  if (body.slug !== undefined) data.slug = body.slug.trim();
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.summary !== undefined) data.summary = body.summary.trim();
  if (body.content !== undefined) data.content = body.content.trim();
  const cat = parseCategory(body.category);
  if (cat) data.category = cat;
  if (body.tags !== undefined) {
    data.tags = Array.isArray(body.tags) ? body.tags.filter(Boolean) : [];
  }
  if (body.thumbnail !== undefined) {
    data.thumbnail = body.thumbnail?.trim() || null;
  }
  if (body.published !== undefined) {
    data.published = Boolean(body.published);
    if (data.published && !body.publishedAt) {
      data.publishedAt = new Date();
    }
    if (!data.published) {
      data.publishedAt = null;
    }
  }
  if (body.publishedAt !== undefined && body.publishedAt) {
    data.publishedAt = new Date(body.publishedAt);
  }

  const db = getPrisma();
  const report = await db.report.update({
    where: { id },
    data,
  });

  return json({ report });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const db = getPrisma();
  await db.report.delete({ where: { id } });
  return json({ ok: true });
}
