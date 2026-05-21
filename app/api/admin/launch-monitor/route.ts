import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { loadLaunchMonitorSnapshot } from "@/lib/monitoring/launch-metrics";
import { loadSystemHealth } from "@/lib/monitoring/system-health";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;

  const hours = Math.min(
    24,
    Math.max(1, Number(request.nextUrl.searchParams.get("hours") ?? "1") || 1),
  );
  const [metrics, system] = await Promise.all([
    loadLaunchMonitorSnapshot(hours),
    loadSystemHealth(),
  ]);

  return json({
    metrics,
    system: {
      ...system,
      recentErrors: system.recentErrors.slice(0, 8),
    },
  });
}
