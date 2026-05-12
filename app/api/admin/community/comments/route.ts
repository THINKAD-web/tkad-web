import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  adminListComments,
  type AdminListCommentsOptions,
} from "@/lib/community/admin-queries";

export const dynamic = "force-dynamic";

function isStatus(
  s: unknown,
): s is NonNullable<AdminListCommentsOptions["status"]> {
  return s === "all" || s === "published" || s === "hidden" || s === "deleted";
}

/** GET /api/admin/community/comments — 어드민 댓글 목록. */
export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const sp = request.nextUrl.searchParams;
  const status = isStatus(sp.get("status"))
    ? (sp.get("status") as AdminListCommentsOptions["status"])
    : "all";
  const hasReports = sp.get("hasReports") === "1";
  const page = Number(sp.get("page") ?? "1");

  const result = await adminListComments({
    status,
    hasReports,
    page: Number.isFinite(page) ? page : 1,
  });
  return json(result);
}
