import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  adminUpdateCommentStatus,
  adminHardDeleteComment,
  type AdminTargetStatus,
} from "@/lib/community/admin-queries";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function isTargetStatus(s: unknown): s is AdminTargetStatus {
  return s === "published" || s === "hidden" || s === "deleted";
}

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
    await adminUpdateCommentStatus(id, status);
    return json({ ok: true });
  } catch (e) {
    console.error("[admin.community.comments.PATCH]", e);
    return json({ error: "Update failed" }, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  try {
    await adminHardDeleteComment(id);
    return json({ ok: true });
  } catch (e) {
    console.error("[admin.community.comments.DELETE]", e);
    return json({ error: "Delete failed" }, 500);
  }
}
