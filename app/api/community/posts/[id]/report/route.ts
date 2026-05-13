import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import { reportCommunityTarget } from "@/lib/community/queries";
import { validateCommunityReportInput } from "@/lib/community/validate";

export const dynamic = "force-dynamic";

function getRequestIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

type Params = { params: Promise<{ id: string }> };

/** POST /api/community/posts/[id]/report — 게시글 신고. */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: postId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const validated = validateCommunityReportInput(
    body as Record<string, unknown>,
  );
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error, field: validated.field },
      { status: 400 },
    );
  }
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { error: "로그인 후 신고할 수 있습니다." },
      { status: 401 },
    );
  }
  const ip = getRequestIp(req);
  const result = await reportCommunityTarget(
    "post",
    postId,
    validated.value.reason,
    ip,
    me.id,
  );
  return NextResponse.json(result);
}
