import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { adminCommunityStats } from "@/lib/community/admin-queries";

export const dynamic = "force-dynamic";

/** GET /api/admin/community/stats — moderation header stats. */
export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const stats = await adminCommunityStats();
  return json({ stats });
}
