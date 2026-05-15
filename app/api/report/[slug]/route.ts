import { NextRequest, NextResponse } from "next/server";
import { getPublishedReportBySlug } from "@/lib/report-queries";

export const dynamic = "force-dynamic";

/** GET /api/report/[slug] — published + slug 일치 시에만 반환 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  if (!slug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const row = await getPublishedReportBySlug(slug);
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      content: row.content,
      category: row.category,
      thumbnail: row.thumbnail,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error("[api/report/[slug]]", e);
    return NextResponse.json(
      { error: "Failed to load report" },
      { status: 500 },
    );
  }
}
