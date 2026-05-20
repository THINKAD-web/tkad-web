import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { loadMonitoringDashboard } from "@/lib/monitoring/dashboard-data";
import type { MonitoringPeriod } from "@/lib/monitoring/period";

export const dynamic = "force-dynamic";

function parsePeriod(raw: string | null): MonitoringPeriod {
  if (raw === "today" || raw === "week" || raw === "month") return raw;
  return "week";
}

export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;

  const period = parsePeriod(
    request.nextUrl.searchParams.get("period"),
  );

  try {
    const data = await loadMonitoringDashboard(period);
    return json(data);
  } catch (e) {
    console.error("[admin/monitoring]", e);
    return json({ error: "Failed to load monitoring data" }, 500);
  }
}
