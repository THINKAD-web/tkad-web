import { NextRequest, NextResponse } from "next/server";
import { listCommunityMembersPaginated } from "@/lib/community/queries";
import { normalizeCommunityMemberRole } from "@/lib/community/types";

export const dynamic = "force-dynamic";

/** GET /api/community/members?role=&region=&page= */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const role = normalizeCommunityMemberRole(sp.get("role"));
  const regionRaw = sp.get("region");
  const region =
    regionRaw && regionRaw.trim() && regionRaw !== "전체" && regionRaw !== "all"
      ? regionRaw.trim()
      : null;
  const pageRaw = Number(sp.get("page") ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  const { members, total, page: pageOut } = await listCommunityMembersPaginated({
    role,
    region,
    page,
  });

  return NextResponse.json({ members, total, page: pageOut });
}
