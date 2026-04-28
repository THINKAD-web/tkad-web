import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  adminUpdatePostStatus,
  adminHardDeletePost,
  type AdminTargetStatus,
} from "@/lib/community/admin-queries";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function isTargetStatus(s: unknown): s is AdminTargetStatus {
  return s === "published" || s === "hidden" || s === "deleted";
}

/** PATCH — status 변경 (복구 / 숨김 / 소프트 삭제). */
export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const status = (body as Record<string, unknown>)?.status;
  if (!isTargetStatus(status)) {
    return json({ error: "Invalid status" }, 400);
  }
  try {
    await adminUpdatePostStatus(id, status);
    return json({ ok: true });
  } catch (e) {
    console.error("[admin.community.posts.PATCH]", e);
    return json({ error: "Update failed" }, 500);
  }
}

/** DELETE — DB 레코드 영구 삭제 (cascade 로 댓글도 함께). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  try {
    await adminHardDeletePost(id);
    return json({ ok: true });
  } catch (e) {
    console.error("[admin.community.posts.DELETE]", e);
    return json({ error: "Delete failed" }, 500);
  }
}
