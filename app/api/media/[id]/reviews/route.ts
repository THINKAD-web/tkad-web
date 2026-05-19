import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import {
  userHasVerifiedExecution,
} from "@/lib/media-reviews";
import { postInternalAlert } from "@/lib/internal-webhook";

export const dynamic = "force-dynamic";

const Body = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().min(2).max(120),
  body: z.string().min(10).max(5000),
  campaignPeriod: z.string().max(80).optional().nullable(),
  industry: z.string().max(60).optional().nullable(),
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
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const db = getPrisma();
  const media = await db.media.findFirst({
    where: { id: mediaId, isActive: true },
    select: { id: true, name: true },
  });
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const existing = await db.mediaReview.findUnique({
    where: { mediaId_userId: { mediaId, userId: user.id } },
    select: { id: true, status: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 이 매체에 리뷰를 작성했습니다." },
      { status: 409 },
    );
  }

  const { verified, campaignId } = await userHasVerifiedExecution(
    user.id,
    mediaId,
  );

  const review = await db.mediaReview.create({
    data: {
      mediaId,
      userId: user.id,
      rating: parsed.data.rating,
      title: parsed.data.title.trim(),
      body: parsed.data.body.trim(),
      campaignPeriod: parsed.data.campaignPeriod?.trim() || null,
      industry: parsed.data.industry?.trim() || null,
      isVerified: verified,
      campaignId,
      status: "PENDING",
    },
    select: { id: true },
  });

  void postInternalAlert({
    type: "media_review_pending",
    title: "매체 리뷰 검수 대기",
    body: `${media.name} — ${parsed.data.title} (${parsed.data.rating}점)`,
    meta: { mediaId, reviewId: review.id },
  });

  return NextResponse.json({
    ok: true,
    reviewId: review.id,
    status: "PENDING",
    isVerified: verified,
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ canReview: false, reason: "login_required" });
  }

  const { id: mediaId } = await params;
  const db = getPrisma();

  const existing = await db.mediaReview.findUnique({
    where: { mediaId_userId: { mediaId, userId: user.id } },
    select: { id: true, status: true },
  });
  if (existing) {
    return NextResponse.json({
      canReview: false,
      reason: "already_reviewed",
      reviewId: existing.id,
      status: existing.status,
    });
  }

  const { verified } = await userHasVerifiedExecution(user.id, mediaId);

  return NextResponse.json({
    canReview: true,
    isVerifiedEligible: verified,
  });
}
