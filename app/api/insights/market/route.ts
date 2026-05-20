import { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/user-session";
import { checkReportAccess } from "@/lib/report-access";
import { buildMarketDashboardData } from "@/lib/insights/market-dashboard-data";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return apiError("SERVICE_UNAVAILABLE", 503);
  }

  const user = await getCurrentUser();
  const access = await checkReportAccess(user?.id ?? null, "market_dashboard");
  if (!access.allowed) {
    return apiError("FORBIDDEN", 403, {
      message: access.reason ?? "upgrade",
    });
  }

  const locale = request.nextUrl.searchParams.get("locale");
  const isKo = locale !== "en";
  const data = await buildMarketDashboardData({ isKo });
  return apiOk(data);
}
