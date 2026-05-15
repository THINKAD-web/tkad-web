import { NextRequest, NextResponse } from "next/server";
import {
  listPublishedReports,
  parseReportCategoryParam,
} from "@/lib/report-queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/report?category=TREND&page=1
 * - published: true 만, 페이지당 최대 20건
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = parseReportCategoryParam(sp.get("category"));
  const pageRaw = Number(sp.get("page") ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  try {
    const { reports, total, page: p, pageSize } = await listPublishedReports({
      category,
      page,
      pageSize: 20,
    });

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        category: r.category,
        thumbnail: r.thumbnail,
        publishedAt: r.publishedAt?.toISOString() ?? null,
      })),
      total,
      page: p,
      pageSize,
    });
  } catch (e) {
    console.error("[api/report]", e);
    return NextResponse.json(
      { error: "Failed to load reports" },
      { status: 500 },
    );
  }
}
