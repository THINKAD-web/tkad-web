import { NextRequest } from "next/server";
import { querySeoulOpenData } from "@/lib/data-sources/seoul-open-data";
import { getDataGoKrServiceKey } from "@/lib/seoul-metro-passenger-api";

export const dynamic = "force-dynamic";

/**
 * 서울 열린데이터광장 프록시
 * GET ?type=metro|bus|tourism&query=강남역
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type")?.trim() as "metro" | "bus" | "tourism" | undefined;
  const query = sp.get("query")?.trim();

  if (!type || !query) {
    return Response.json(
      { error: "type and query required (type=metro|bus|tourism)" },
      { status: 400 },
    );
  }

  if (!getDataGoKrServiceKey()) {
    return Response.json(
      {
        error: "DATA_GO_KR_SERVICE_KEY not configured",
        configured: false,
      },
      { status: 503 },
    );
  }

  const result = await querySeoulOpenData({ type, query });
  if (!result) {
    return Response.json({ ok: true, data: null, message: "No data for query" });
  }

  return Response.json({ ok: true, data: result });
}
