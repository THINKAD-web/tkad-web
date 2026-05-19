import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";

export const dynamic = "force-dynamic";

const Body = z.object({
  reviewId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id: mediaId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const db = getPrisma();
  const review = await db.mediaReview.findFirst({
    where: {
      id: parsed.data.reviewId,
      mediaId,
      status: "APPROVED",
    },
    select: { id: true },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const existing = await db.mediaReviewHelpful.findUnique({
    where: {
      reviewId_userId: {
        reviewId: review.id,
        userId: user.id,
      },
    },
  });

  if (existing) {
    await db.$transaction([
      db.mediaReviewHelpful.delete({ where: { id: existing.id } }),
      db.mediaReview.update({
        where: { id: review.id },
        data: { helpfulCount: { decrement: 1 } },
      }),
    ]);
    const updated = await db.mediaReview.findUnique({
      where: { id: review.id },
      select: { helpfulCount: true },
    });
    return NextResponse.json({
      helpful: false,
      helpfulCount: updated?.helpfulCount ?? 0,
    });
  }

  await db.$transaction([
    db.mediaReviewHelpful.create({
      data: { reviewId: review.id, userId: user.id },
    }),
    db.mediaReview.update({
      where: { id: review.id },
      data: { helpfulCount: { increment: 1 } },
    }),
  ]);

  const updated = await db.mediaReview.findUnique({
    where: { id: review.id },
    select: { helpfulCount: true },
  });

  return NextResponse.json({
    helpful: true,
    helpfulCount: updated?.helpfulCount ?? 1,
  });
}
