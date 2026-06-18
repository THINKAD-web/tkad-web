import { NextRequest } from "next/server";
import {
  assertAdminDb,
  adminDbQueryFailed,
  json,
} from "@/lib/admin-guard";
import { listAdminPlanReportActivities } from "@/lib/plan-report-activity/admin-queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;

  try {
    const sp = request.nextUrl.searchParams;
    const page = Number(sp.get("page") ?? "1");
    const pageSize = Number(sp.get("pageSize") ?? "20");
    const userId = sp.get("userId")?.trim() || undefined;
    const eventType = sp.get("eventType") ?? "all";
    const source = sp.get("source") ?? "all";

    const result = await listAdminPlanReportActivities({
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      userId,
      eventType,
      source,
    });

    return json(result);
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}
