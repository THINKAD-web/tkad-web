import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import { likeCommunityPost } from "@/lib/community/queries";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** POST /api/community/posts/[id]/like — 좋아요 (가입 사용자: userId, 익명: ipHash unique) */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: postId } = await params;
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { error: "로그인 후 좋아요를 누를 수 있습니다." },
      { status: 401 },
    );
  }
  const result = await likeCommunityPost(postId, me.id);
  return NextResponse.json(result);
}
