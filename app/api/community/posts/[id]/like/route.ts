import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import { likeCommunityPost } from "@/lib/community/queries";

export const dynamic = "force-dynamic";

function getRequestIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

type Params = { params: Promise<{ id: string }> };

/** POST /api/community/posts/[id]/like — 좋아요 (가입 사용자: userId, 익명: ipHash unique) */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: postId } = await params;
  const me = await getCurrentUser();
  const ip = me ? null : getRequestIp(req);
  const result = await likeCommunityPost(postId, me?.id ?? null, ip);
  return NextResponse.json(result);
}
