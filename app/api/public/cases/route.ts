import { NextRequest } from "next/server";
import { getPublishedSuccessCases } from "@/lib/public-content-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limitRaw = request.nextUrl.searchParams.get("limit");
  const locale = request.nextUrl.searchParams.get("locale") ?? "ko";
  const limit = Math.min(24, Math.max(1, Number(limitRaw) || 6));

  const cases = await getPublishedSuccessCases(locale);
  const data = cases.slice(0, limit);

  return Response.json({ data, total: cases.length });
}
