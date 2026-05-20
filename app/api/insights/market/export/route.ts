import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import { checkReportAccess } from "@/lib/report-access";
import { buildMarketExportCsv } from "@/lib/insights/market-dashboard-data";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return new Response("Service unavailable", { status: 503 });
  }

  const user = await getCurrentUser();
  const access = await checkReportAccess(user?.id ?? null, "market_dashboard");
  if (!access.allowed) {
    return new Response("PRO subscription required", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const dataset = (sp.get("dataset") ?? "all") as
    | "media"
    | "district"
    | "industry"
    | "season"
    | "all";
  const isKo = sp.get("locale") !== "en";
  const csv = await buildMarketExportCsv(dataset, isKo);
  const filename = `thinkad-market-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
