import { NextRequest } from "next/server";
import type { ReportCategory } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { REPORT_CATEGORY_ORDER } from "@/lib/report-category";

export const dynamic = "force-dynamic";

function parseCategory(raw: string | null): ReportCategory | null {
  if (!raw) return null;
  const v = raw.toUpperCase() as ReportCategory;
  return REPORT_CATEGORY_ORDER.includes(v) ? v : null;
}

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const published = request.nextUrl.searchParams.get("published");
  const db = getPrisma();
  const where =
    published === "true"
      ? { published: true }
      : published === "false"
        ? { published: false }
        : {};

  const reports = await db.report.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      published: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  return json({ reports });
}

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

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

  const slug = body.slug?.trim();
  const title = body.title?.trim();
  const summary = body.summary?.trim();
  const content = body.content?.trim();
  const category = parseCategory(body.category ?? null);

  if (!slug || !title || !summary || !content || !category) {
    return json({ error: "slug, title, summary, content, category required" }, 400);
  }

  const db = getPrisma();
  const published = Boolean(body.published);
  const publishedAt =
    published && body.publishedAt
      ? new Date(body.publishedAt)
      : published
        ? new Date()
        : null;

  const report = await db.report.create({
    data: {
      slug,
      title,
      summary,
      content,
      category,
      tags: Array.isArray(body.tags) ? body.tags.filter(Boolean) : [],
      thumbnail: body.thumbnail?.trim() || null,
      published,
      publishedAt,
    },
  });

  return json({ report }, 201);
}
