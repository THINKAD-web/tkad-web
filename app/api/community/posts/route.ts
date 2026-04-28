import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileForRequest } from "@/lib/turnstile-verify";
import { getCurrentUser } from "@/lib/user-session";
import {
  createCommunityPost,
  listCommunityPosts,
} from "@/lib/community/queries";
import { validateCommunityPostInput } from "@/lib/community/validate";
import {
  COMMUNITY_LIMITS,
  type CommunityCategory,
} from "@/lib/community/types";

export const dynamic = "force-dynamic";

// 익명 / 사용자 별 글 작성 한도 (시간당)
const anonPostLimiter = rateLimit({
  limit: COMMUNITY_LIMITS.ANON_POST_PER_HOUR,
  windowMs: 60 * 60 * 1000,
});
const userPostLimiter = rateLimit({
  limit: COMMUNITY_LIMITS.USER_POST_PER_HOUR,
  windowMs: 60 * 60 * 1000,
});

function getRequestIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** GET /api/community/posts — 목록 (페이지·카테고리·정렬). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const cat = sp.get("category") as CommunityCategory | null;
  const page = Number(sp.get("page") ?? "1");
  const sort = sp.get("sort") === "popular" ? "popular" : "new";

  const result = await listCommunityPosts({
    category: cat ?? undefined,
    page: Number.isFinite(page) ? page : 1,
    sort,
  });

  return NextResponse.json(result);
}

/** POST /api/community/posts — 작성. Turnstile + rate limit + 검증. */
export async function POST(req: NextRequest) {
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

  // honeypot
  if ((body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: true, id: "trap" }, { status: 201 });
  }

  const turnstileToken =
    (body as Record<string, unknown>).turnstileToken;
  const turnstile = await verifyTurnstileForRequest({
    token: typeof turnstileToken === "string" ? turnstileToken : undefined,
    remoteip: ip,
    host: req.headers.get("host"),
  });
  if (!turnstile.ok) {
    return NextResponse.json(
      { error: "캡차 검증에 실패했습니다.", reason: turnstile.reason },
      { status: 403 },
    );
  }

  const validated = validateCommunityPostInput(body as Record<string, unknown>);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error, field: validated.field },
      { status: 400 },
    );
  }

  const me = await getCurrentUser();
  // rate limit — 가입 사용자: userId 키, 익명: IP 키
  const limiter = me ? userPostLimiter : anonPostLimiter;
  const limiterKey = me ? `u:${me.id}` : `ip:${ip}`;
  if (!limiter.check(limiterKey)) {
    return NextResponse.json(
      { error: "잠시 후 다시 시도해주세요. (작성 한도 초과)" },
      { status: 429 },
    );
  }

  // 가입 사용자 + 익명 동시 사용 정책: isAnonymous=true 면 인증 무시
  const useAnon = validated.value.isAnonymous || !me;
  const authorUserId = useAnon ? null : me?.id ?? null;
  const authorEmail = useAnon
    ? validated.value.authorEmail
    : me?.email ?? null;
  const authorName = useAnon
    ? validated.value.authorName
    : me?.name ?? validated.value.authorName;

  try {
    const created = await createCommunityPost({
      category: validated.value.category,
      title: validated.value.title,
      body: validated.value.body,
      authorName,
      authorEmail,
      authorUserId,
      isAnonymous: useAnon,
      authorIp: ip,
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error("[community.posts.POST]", e);
    return NextResponse.json(
      { error: "글을 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}
