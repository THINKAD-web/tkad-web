import { NextRequest, NextResponse } from "next/server";
import {
  listFeaturedCommunityPosts,
  shouldDegradeHomeCommunityPosts,
  type FeaturedCommunitySort,
} from "@/lib/community/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/community/posts/featured?sortBy=popular|latest&limit=3
 * - `popular`: likeCount desc, 동률 시 최신순. 공개 글이 5개 미만이면 자동으로 `latest` 로 전환.
 * - `latest`: createdAt desc
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sortBy: FeaturedCommunitySort =
    sp.get("sortBy") === "latest" ? "latest" : "popular";
  const lim = Number(sp.get("limit") ?? "3");
  const limit = Number.isFinite(lim) && lim >= 1 ? Math.min(20, Math.floor(lim)) : 3;

  try {
    const out = await listFeaturedCommunityPosts({ limit, sortBy });
    return NextResponse.json(out);
  } catch (e) {
    if (shouldDegradeHomeCommunityPosts(e)) {
      return NextResponse.json({ posts: [], sortBy });
    }
    console.error("[api/community/posts/featured]", e);
    return NextResponse.json(
      { error: "Failed to load featured posts" },
      { status: 500 },
    );
  }
}
