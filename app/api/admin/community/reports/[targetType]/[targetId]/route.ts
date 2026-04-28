import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { adminGetReportsForTarget } from "@/lib/community/admin-queries";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ targetType: string; targetId: string }> };

/** GET /api/admin/community/reports/[targetType]/[targetId] — 특정 대상의 신고 목록. */
export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { targetType, targetId } = await params;
  if (targetType !== "post" && targetType !== "comment") {
    return json({ error: "Invalid targetType" }, 400);
  }
  const reports = await adminGetReportsForTarget(targetType, targetId);
  return json({ reports });
}
