import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile-verify";
import { getCurrentUser } from "@/lib/user-session";
import { createCommunityComment } from "@/lib/community/queries";
import { validateCommunityCommentInput } from "@/lib/community/validate";
import { COMMUNITY_LIMITS } from "@/lib/community/types";

export const dynamic = "force-dynamic";

const anonCommentLimiter = rateLimit({
  limit: COMMUNITY_LIMITS.ANON_COMMENT_PER_HOUR,
  windowMs: 60 * 60 * 1000,
});
const userCommentLimiter = rateLimit({
  limit: COMMUNITY_LIMITS.USER_COMMENT_PER_HOUR,
  windowMs: 60 * 60 * 1000,
});

function getRequestIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

type Params = { params: Promise<{ id: string }> };

/** POST /api/community/posts/[id]/comments — 댓글 작성. */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: postId } = await params;
  const ip = getRequestIp(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if ((body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: true, id: "trap" }, { status: 201 });
  }

  const turnstileToken = (body as Record<string, unknown>).turnstileToken;
  const turnstile = await verifyTurnstileToken(
    typeof turnstileToken === "string" ? turnstileToken : undefined,
    ip,
  );
  if (!turnstile.ok) {
    return NextResponse.json(
      { error: "캡차 검증에 실패했습니다.", reason: turnstile.reason },
      { status: 403 },
    );
  }

  const validated = validateCommunityCommentInput(body as Record<string, unknown>);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error, field: validated.field },
      { status: 400 },
    );
  }

  const me = await getCurrentUser();
  const limiter = me ? userCommentLimiter : anonCommentLimiter;
  const limiterKey = me ? `u:${me.id}` : `ip:${ip}`;
  if (!limiter.check(limiterKey)) {
    return NextResponse.json(
      { error: "잠시 후 다시 시도해주세요. (댓글 한도 초과)" },
      { status: 429 },
    );
  }

  const useAnon = validated.value.isAnonymous || !me;
  const authorUserId = useAnon ? null : me?.id ?? null;
  const authorEmail = useAnon ? null : me?.email ?? null;
  const authorName = useAnon
    ? validated.value.authorName
    : me?.name ?? validated.value.authorName;

  try {
    const created = await createCommunityComment({
      postId,
      body: validated.value.body,
      authorName,
      authorUserId,
      authorEmail,
      isAnonymous: useAnon,
      authorIp: ip,
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("not found")) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }
    console.error("[community.comments.POST]", e);
    return NextResponse.json(
      { error: "댓글을 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}
