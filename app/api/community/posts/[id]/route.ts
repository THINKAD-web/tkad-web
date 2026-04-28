import { NextRequest, NextResponse } from "next/server";
import { getCommunityPostDetail } from "@/lib/community/queries";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/community/posts/[id] — 상세 (조회수 자동 증가). */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const post = await getCommunityPostDetail(id, { incrementView: true });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ post });
}
