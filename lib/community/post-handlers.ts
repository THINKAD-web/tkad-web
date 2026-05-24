import type { CommunityCategory } from "@/lib/community/types";
import type { CommunityPostMetadataInput } from "@/lib/community/post-metadata";
import { createAiRecommendReply } from "@/lib/community/ai-recommend-reply";
import {
  createMediaReviewFromCommunityPost,
  ExecutionReviewError,
  persistExecutionReviewMetadata,
} from "@/lib/community/execution-review-bridge";

export type PostCreatedHandlerResult = {
  mediaReviewId?: string;
};

export type PostCreatedHandlerInput = {
  postId: string;
  category: CommunityCategory;
  title: string;
  body: string;
  metadata: CommunityPostMetadataInput;
  authorUserId: string;
  authorName: string;
  locale: string;
};

export async function handleCommunityPostCreated(
  input: PostCreatedHandlerInput,
): Promise<PostCreatedHandlerResult> {
  if (input.category === "media_recommend") {
    await createAiRecommendReply({
      postId: input.postId,
      metadata: input.metadata,
      locale: input.locale,
    });
    return {};
  }

  if (input.category === "execution_review") {
    const mediaReviewId = await createMediaReviewFromCommunityPost({
      userId: input.authorUserId,
      title: input.title,
      body: input.body,
      metadata: input.metadata,
    });
    await persistExecutionReviewMetadata(
      input.postId,
      mediaReviewId,
      input.metadata,
    );
    return { mediaReviewId };
  }

  return {};
}

export function mapExecutionReviewError(e: unknown): {
  error: string;
  field?: string;
  status: number;
} | null {
  if (e instanceof ExecutionReviewError) {
    return { error: e.message, field: e.field, status: e.status };
  }
  return null;
}
