import { NextRequest } from "next/server";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { withApiKeyAuth } from "@/lib/api-key-auth";
import {
  filterV1MediaList,
  paginate,
  parseV1Pagination,
} from "@/lib/api-v1-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseBool(v: string | null): boolean | null {
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

function parseIntOrNull(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

export async function GET(request: NextRequest) {
  return withApiKeyAuth(request, "/api/v1/media", async () => {
    const sp = request.nextUrl.searchParams;
    const { page, limit } = parseV1Pagination(sp);

    const catalog = await fetchPublicMediaCatalog();
    const filtered = filterV1MediaList(catalog, {
      region: sp.get("region"),
      type: sp.get("type"),
      minPrice: parseIntOrNull(sp.get("minPrice")),
      maxPrice: parseIntOrNull(sp.get("maxPrice")),
      available: parseBool(sp.get("available")),
    });

    const { data, pagination } = paginate(filtered, page, limit);
    return Response.json({ data, pagination });
  });
}
