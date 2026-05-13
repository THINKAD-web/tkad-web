import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import {
  deleteCommunityComment,
  updateCommunityComment,
} from "@/lib/community/queries";
import { validateCommunityCommentInput } from "@/lib/community/validate";
import {
  fallbackCommunityRoleFromAppRole,
  normalizeCommunityMemberRole,
} from "@/lib/community/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; commentId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: postId, commentId } = await params;
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { error: "로그인 후 댓글을 수정할 수 있습니다." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const validated = validateCommunityCommentInput(body as Record<string, unknown>);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error, field: validated.field },
      { status: 400 },
    );
  }

  try {
    const updated = await updateCommunityComment({
      postId,
      commentId,
      userId: me.id,
      body: validated.value.body,
    });
    return NextResponse.json({
      ok: true,
      comment: {
        id: updated.id,
        content: updated.body,
        createdAt: updated.createdAt.toISOString(),
        authorName: updated.authorName,
        author: updated.authorUser
          ? {
              id: updated.authorUser.id,
              name: updated.authorUser.name,
              company: updated.authorUser.company,
              role:
                normalizeCommunityMemberRole(updated.authorUser.communityRole) ??
                fallbackCommunityRoleFromAppRole(updated.authorUser.role),
              bio: updated.authorUser.communityBio,
            }
          : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "본인 댓글만 수정할 수 있습니다." },
        { status: 403 },
      );
    }
    if (message.includes("not found")) {
      return NextResponse.json(
        { error: "댓글을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    console.error("[community.comments.PATCH]", error);
    return NextResponse.json(
      { error: "댓글을 수정하지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: postId, commentId } = await params;
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { error: "로그인 후 댓글을 삭제할 수 있습니다." },
      { status: 401 },
    );
  }

  try {
    await deleteCommunityComment({
      postId,
      commentId,
      userId: me.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "본인 댓글만 삭제할 수 있습니다." },
        { status: 403 },
      );
    }
    if (message.includes("not found")) {
      return NextResponse.json(
        { error: "댓글을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    console.error("[community.comments.DELETE]", error);
    return NextResponse.json(
      { error: "댓글을 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
}
