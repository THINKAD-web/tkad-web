import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getVisitConversionFunnel } from "@/lib/conversion-funnel";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;
  const raw = request.nextUrl.searchParams.get("period");
  const periodDays = raw === "7" ? 7 : 30;
  try {
    const funnel = await getVisitConversionFunnel(periodDays);
    return json({ funnel });
  } catch (e) {
    console.error("[conversion-funnel]", e instanceof Error ? e.message : e);
    return json({ funnel: null });
  }
}
