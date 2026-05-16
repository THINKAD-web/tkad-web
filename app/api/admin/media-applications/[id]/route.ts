import { NextRequest } from "next/server";
import type { MediaApplicationStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { MEDIA_APPLICATION_STATUSES } from "@/lib/media-application";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const db = getPrisma();
  const application = await db.mediaApplication.findUnique({ where: { id } });
  if (!application) {
    return json({ error: "Not found" }, 404);
  }
  return json({ application });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  let body: { status?: string; reviewNote?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const data: {
    status?: MediaApplicationStatus;
    reviewNote?: string | null;
    reviewedAt?: Date;
  } = {};

  if (body.status) {
    const s = body.status.toUpperCase();
    if (!MEDIA_APPLICATION_STATUSES.includes(s as MediaApplicationStatus)) {
      return json({ error: "Invalid status" }, 400);
    }
    data.status = s as MediaApplicationStatus;
    if (s === "REVIEWING" || s === "APPROVED" || s === "REJECTED") {
      data.reviewedAt = new Date();
    }
  }
  if (body.reviewNote !== undefined) {
    data.reviewNote = body.reviewNote?.trim() || null;
  }

  const db = getPrisma();
  const application = await db.mediaApplication.update({
    where: { id },
    data,
  });
  return json({ application });
}
