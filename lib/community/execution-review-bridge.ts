import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  asExecutionReviewMetadata,
  type CommunityPostMetadataInput,
} from "@/lib/community/post-metadata";
import { userHasVerifiedExecution } from "@/lib/media-reviews";
import { postInternalAlert } from "@/lib/internal-webhook";

export class ExecutionReviewError extends Error {
  constructor(
    message: string,
    public field?: string,
    public status = 400,
  ) {
    super(message);
    this.name = "ExecutionReviewError";
  }
}

export async function createMediaReviewFromCommunityPost(opts: {
  userId: string;
  title: string;
  body: string;
  metadata: CommunityPostMetadataInput;
}): Promise<string> {
  const meta = asExecutionReviewMetadata(opts.metadata);
  if (!meta) {
    throw new ExecutionReviewError(
      "집행 매체와 별점을 입력해주세요.",
      "metadata",
    );
  }

  const db = getPrisma();
  const media = await db.media.findFirst({
    where: { id: meta.mediaId, isActive: true },
    select: { id: true, name: true },
  });
  if (!media) {
    throw new ExecutionReviewError("선택한 매체를 찾을 수 없습니다.", "metadata", 404);
  }

  const existing = await db.mediaReview.findUnique({
    where: { mediaId_userId: { mediaId: meta.mediaId, userId: opts.userId } },
    select: { id: true },
  });
  if (existing) {
    throw new ExecutionReviewError(
      "이미 이 매체에 리뷰를 작성했습니다. 다른 매체를 선택해주세요.",
      "metadata",
      409,
    );
  }

  const { verified, campaignId } = await userHasVerifiedExecution(
    opts.userId,
    meta.mediaId,
  );

  const review = await db.mediaReview.create({
    data: {
      mediaId: meta.mediaId,
      userId: opts.userId,
      rating: meta.rating,
      title: opts.title.trim().slice(0, 120),
      body: opts.body.trim(),
      industry: null,
      isVerified: verified,
      campaignId,
      status: "PENDING",
    },
    select: { id: true },
  });

  void postInternalAlert({
    type: "media_review_pending",
    title: "커뮤니티 집행 후기 → 매체 리뷰",
    body: `${media.name} — ${opts.title} (${meta.rating}점)`,
    meta: { mediaId: meta.mediaId, reviewId: review.id },
  });

  return review.id;
}

export async function persistExecutionReviewMetadata(
  postId: string,
  mediaReviewId: string,
  metadata: CommunityPostMetadataInput,
): Promise<void> {
  const db = getPrisma();
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  await db.communityPost.update({
    where: { id: postId },
    data: {
      metadata: { ...base, mediaReviewId } as Prisma.InputJsonValue,
    },
  });
}
