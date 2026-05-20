import { NextRequest } from "next/server";
import { withApiKeyAuth, v1Error, v1Json } from "@/lib/api-key-auth";
import { buildMarketDashboardData } from "@/lib/insights/market-dashboard-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiKeyAuth(request, "/api/v1/insights/market", async (apiKey) => {
    if (apiKey.plan !== "ENTERPRISE") {
      return v1Error(
        "FORBIDDEN",
        403,
        "Market insights API requires ENTERPRISE API key plan",
      );
    }
    const isKo = request.nextUrl.searchParams.get("locale") !== "en";
    const data = await buildMarketDashboardData({ isKo });
    return v1Json({ data, generatedAt: data.generatedAt });
  });
}
