import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/user-session";
import {
  createCommunityPost,
  listCommunityPosts,
} from "@/lib/community/queries";
import { validateCommunityPostInput } from "@/lib/community/validate";
import {
  handleCommunityPostCreated,
  mapExecutionReviewError,
} from "@/lib/community/post-handlers";
import {
  COMMUNITY_LIMITS,
  type CommunityCategory,
} from "@/lib/community/types";

export const dynamic = "force-dynamic";

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

/** POST /api/community/posts — 작성. */
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

  if ((body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: true, id: "trap" }, { status: 201 });
  }

  const validated = validateCommunityPostInput(body as Record<string, unknown>);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error, field: validated.field },
      { status: 400 },
    );
  }

  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { error: "로그인 후 글을 작성할 수 있습니다." },
      { status: 401 },
    );
  }

  if (validated.value.category === "notice" && me.role !== "admin") {
    return NextResponse.json(
      { error: "공지사항은 운영팀만 작성할 수 있습니다." },
      { status: 403 },
    );
  }

  if (!userPostLimiter.check(`u:${me.id}`)) {
    return NextResponse.json(
      { error: "잠시 후 다시 시도해주세요. (작성 한도 초과)" },
      { status: 429 },
    );
  }

  try {
    const created = await createCommunityPost({
      category: validated.value.category,
      title: validated.value.title,
      body: validated.value.body,
      authorName: me.name,
      authorEmail: me.email ?? null,
      authorUserId: me.id,
      authorIp: ip,
      metadata: validated.value.metadata,
      isPinned: validated.value.category === "notice",
    });

    let handlerResult: { mediaReviewId?: string } = {};
    try {
      handlerResult = await handleCommunityPostCreated({
        postId: created.id,
        category: validated.value.category,
        title: validated.value.title,
        body: validated.value.body,
        metadata: validated.value.metadata,
        authorUserId: me.id,
        authorName: me.name,
        locale: me.locale ?? "ko",
      });
    } catch (e) {
      const mapped = mapExecutionReviewError(e);
      if (mapped) {
        return NextResponse.json(
          { error: mapped.error, field: mapped.field },
          { status: mapped.status },
        );
      }
      throw e;
    }

    const { awardPoints } = await import("@/lib/points");
    if (validated.value.category === "execution_review" && handlerResult.mediaReviewId) {
      void awardPoints(me.id, "REVIEW_WRITE", handlerResult.mediaReviewId).catch(
        () => {},
      );
    } else {
      void awardPoints(me.id, "COMMUNITY_POST", created.id).catch(() => {});
    }

    return NextResponse.json(
      {
        ok: true,
        id: created.id,
        mediaReviewId: handlerResult.mediaReviewId,
        pointsAwarded:
          validated.value.category === "execution_review" ? 200 : 100,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[community.posts.POST]", e);
    return NextResponse.json(
      { error: "글을 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}
