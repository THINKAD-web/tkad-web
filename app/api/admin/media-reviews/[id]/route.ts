import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import type { MediaReviewStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function isStatus(s: unknown): s is MediaReviewStatus {
  return s === "APPROVED" || s === "REJECTED" || s === "PENDING";
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
  if (!isStatus(status) || status === "PENDING") {
    return json({ error: "Invalid status" }, 400);
  }

  const db = getPrisma();
  const review = await db.mediaReview.update({
    where: { id },
    data: { status },
    include: {
      media: { select: { id: true, name: true } },
    },
  });

  if (status === "APPROVED") {
    await createNotification({
      userId: review.userId,
      type: "SYSTEM",
      title: "리뷰가 게시되었습니다",
      body: `${review.media.name} — ${review.title}`,
      link: `/media/${review.mediaId}`,
      dedupeKey: `review_approved:${review.id}`,
    });
  }

  return json({ ok: true, status: review.status });
}
