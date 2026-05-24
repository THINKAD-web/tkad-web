/**
 * Community 입력 검증
 */

import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_INDUSTRY_OPTIONS,
  COMMUNITY_LIMITS,
  COMMUNITY_REGION_OPTIONS,
  normalizeCommunityCategory,
  type CommunityCategory,
} from "@/lib/community/types";
import {
  asExecutionReviewMetadata,
  asMediaRecommendMetadata,
  type CommunityPostMetadataInput,
} from "@/lib/community/post-metadata";

export type ValidatePostInput = {
  category?: unknown;
  title?: unknown;
  body?: unknown;
  metadata?: unknown;
};

export type ValidatedPostInput = {
  category: CommunityCategory;
  title: string;
  body: string;
  metadata: CommunityPostMetadataInput;
};

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; field?: string };

function parseMetadataInput(raw: unknown): CommunityPostMetadataInput {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

export function validateCommunityPostInput(
  input: ValidatePostInput,
): Result<ValidatedPostInput> {
  const cat = normalizeCommunityCategory(input.category);
  if (!cat || !(COMMUNITY_CATEGORIES as readonly string[]).includes(cat)) {
    return { ok: false, error: "잘못된 카테고리입니다.", field: "category" };
  }
  const title =
    typeof input.title === "string" &&
    input.title.trim().length > 0 &&
    input.title.trim().length <= COMMUNITY_LIMITS.POST_TITLE_MAX
      ? input.title.trim()
      : null;
  if (!title) {
    return {
      ok: false,
      error: `제목은 1자 이상 ${COMMUNITY_LIMITS.POST_TITLE_MAX}자 이내여야 합니다.`,
      field: "title",
    };
  }
  if (typeof input.body !== "string") {
    return { ok: false, error: "본문이 비어있습니다.", field: "body" };
  }
  const body = input.body.trim();
  if (
    body.length < COMMUNITY_LIMITS.POST_BODY_MIN ||
    body.length > COMMUNITY_LIMITS.POST_BODY_MAX
  ) {
    return {
      ok: false,
      error: `본문은 ${COMMUNITY_LIMITS.POST_BODY_MIN}자 이상 ${COMMUNITY_LIMITS.POST_BODY_MAX}자 이내여야 합니다.`,
      field: "body",
    };
  }

  const metadata = parseMetadataInput(input.metadata);

  if (cat === "media_recommend") {
    const rec = asMediaRecommendMetadata(metadata);
    if (!rec) {
      return {
        ok: false,
        error: "예산, 지역, 업종을 모두 입력해주세요.",
        field: "metadata",
      };
    }
    const regionOk = COMMUNITY_REGION_OPTIONS.some((r) => r.value === rec.region);
    const industryOk = COMMUNITY_INDUSTRY_OPTIONS.some(
      (i) => i.value === rec.industry,
    );
    if (!regionOk || !industryOk) {
      return {
        ok: false,
        error: "지역 또는 업종 선택이 올바르지 않습니다.",
        field: "metadata",
      };
    }
  }

  if (cat === "execution_review") {
    const rev = asExecutionReviewMetadata(metadata);
    if (!rev) {
      return {
        ok: false,
        error: "집행 매체와 별점(1–5)을 선택해주세요.",
        field: "metadata",
      };
    }
  }

  return {
    ok: true,
    value: {
      category: cat,
      title,
      body,
      metadata,
    },
  };
}

export type ValidateCommentInput = {
  content?: unknown;
  body?: unknown;
};

export type ValidatedCommentInput = {
  body: string;
};

export function validateCommunityCommentInput(
  input: ValidateCommentInput,
): Result<ValidatedCommentInput> {
  const raw = typeof input.content === "string" ? input.content : input.body;
  if (typeof raw !== "string") {
    return { ok: false, error: "댓글이 비어있습니다.", field: "body" };
  }
  const body = raw.trim();
  if (
    body.length < COMMUNITY_LIMITS.COMMENT_BODY_MIN ||
    body.length > COMMUNITY_LIMITS.COMMENT_BODY_MAX
  ) {
    return {
      ok: false,
      error: `댓글은 ${COMMUNITY_LIMITS.COMMENT_BODY_MIN}자 이상 ${COMMUNITY_LIMITS.COMMENT_BODY_MAX}자 이내여야 합니다.`,
      field: "body",
    };
  }
  return { ok: true, value: { body } };
}

export type ValidateReportInput = {
  reason?: unknown;
};

export function validateCommunityReportInput(
  input: ValidateReportInput,
): Result<{ reason: string }> {
  if (typeof input.reason !== "string") {
    return { ok: false, error: "신고 사유를 입력해주세요.", field: "reason" };
  }
  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 500) {
    return {
      ok: false,
      error: "신고 사유는 5자 이상 500자 이내로 입력해주세요.",
      field: "reason",
    };
  }
  return { ok: true, value: { reason } };
}
