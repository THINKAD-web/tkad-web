import { NextRequest } from "next/server";
import { getPublishedInsightReports } from "@/lib/public-content-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(24, Math.max(1, Number(limitRaw) || 6));

  const reports = await getPublishedInsightReports();
  const data = reports.slice(0, limit);

  return Response.json({ data, total: reports.length });
}
