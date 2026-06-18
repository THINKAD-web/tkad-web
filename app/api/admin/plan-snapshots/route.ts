import { NextRequest } from "next/server";
import {
  assertAdminDb,
  adminDbQueryFailed,
  json,
} from "@/lib/admin-guard";
import { listAdminSavedPlanCarts } from "@/lib/saved-plan-cart/admin-queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;

  try {
    const sp = request.nextUrl.searchParams;
    const page = Number(sp.get("page") ?? "1");
    const pageSize = Number(sp.get("pageSize") ?? "20");
    const status = sp.get("status") ?? "all";
    const publishIntent = sp.get("publishIntent") ?? "all";
    const userId = sp.get("userId")?.trim() || undefined;
    const q = sp.get("q") ?? undefined;

    const result = await listAdminSavedPlanCarts({
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      status,
      publishIntent,
      userId,
      q,
    });

    return json(result);
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}
