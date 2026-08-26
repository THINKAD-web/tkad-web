import { NextRequest } from "next/server";
import { mediaItemsToCatalogListItems } from "@/lib/media-catalog-list-dto";
import { isDatabaseConfigured } from "@/lib/prisma";
import { queryMergedMediaBrowse } from "@/lib/merged-media-browse";
import { parsePublicMediaQuery } from "@/lib/public-media-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = parsePublicMediaQuery(request.nextUrl.searchParams);

  if (!isDatabaseConfigured()) {
    return Response.json({
      data: [],
      pagination: { page: 1, total: 0, limit: params.limit ?? 24 },
    });
  }

  try {
    const { data, total, page, limit, totalPages } =
      await queryMergedMediaBrowse(params);

    return Response.json({
      data: mediaItemsToCatalogListItems(data),
      pagination: { page, limit, total, totalPages },
    });
  } catch (e) {
    console.error("[api/public/media]", e);
    return Response.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}
