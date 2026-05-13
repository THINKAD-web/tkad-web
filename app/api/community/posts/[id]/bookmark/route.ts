import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import { toggleCommunityBookmark } from "@/lib/community/queries";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** POST /api/community/posts/[id]/bookmark — 북마크 토글. */
export async function POST(_req: Request, { params }: Params) {
  const { id: postId } = await params;
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { error: "로그인 후 북마크할 수 있습니다." },
      { status: 401 },
    );
  }
  const result = await toggleCommunityBookmark(postId, me.id);
  return NextResponse.json(result);
}
