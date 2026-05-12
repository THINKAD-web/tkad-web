import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  adminListPosts,
  type AdminListPostsOptions,
} from "@/lib/community/admin-queries";
import type { CommunityCategory } from "@/lib/community/types";

export const dynamic = "force-dynamic";

function isCategory(s: unknown): s is CommunityCategory {
  return s === "qa" || s === "review" || s === "recommend";
}

function isStatus(
  s: unknown,
): s is NonNullable<AdminListPostsOptions["status"]> {
  return s === "all" || s === "published" || s === "hidden" || s === "deleted";
}

/** GET /api/admin/community/posts — 어드민 게시글 목록 (전체 status 조회 가능). */
export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const sp = request.nextUrl.searchParams;
  const status = isStatus(sp.get("status")) ? (sp.get("status") as AdminListPostsOptions["status"]) : "all";
  const category = isCategory(sp.get("category")) ? (sp.get("category") as CommunityCategory) : undefined;
  const hasReports = sp.get("hasReports") === "1";
  const page = Number(sp.get("page") ?? "1");

  const result = await adminListPosts({
    status,
    category,
    hasReports,
    page: Number.isFinite(page) ? page : 1,
  });
  return json(result);
}
