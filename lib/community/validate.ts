/**
 * Community 입력 검증 — 외부 라이브러리 의존 없음 (zod 도 안 씀, 가벼운 manual 검증).
 *
 * 모든 검증 결과는 `{ ok: true, value } | { ok: false, error: string }` 형식.
 */

import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_LIMITS,
  type CommunityCategory,
} from "@/lib/community/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidatePostInput = {
  category?: unknown;
  title?: unknown;
  body?: unknown;
  authorName?: unknown;
  authorEmail?: unknown;
  isAnonymous?: unknown;
};

export type ValidatedPostInput = {
  category: CommunityCategory;
  title: string;
  body: string;
  authorName: string;
  authorEmail: string | null;
  isAnonymous: boolean;
};

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; field?: string };

function asString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0 || t.length > max) return null;
  return t;
}

export function validateCommunityPostInput(
  input: ValidatePostInput,
): Result<ValidatedPostInput> {
  const cat = input.category;
  if (
    typeof cat !== "string" ||
    !(COMMUNITY_CATEGORIES as readonly string[]).includes(cat)
  ) {
    return { ok: false, error: "잘못된 카테고리입니다.", field: "category" };
  }
  const title = asString(input.title, COMMUNITY_LIMITS.POST_TITLE_MAX);
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
  const isAnonymous = input.isAnonymous === true || input.isAnonymous === "true";
  const authorName =
    asString(input.authorName, COMMUNITY_LIMITS.AUTHOR_NAME_MAX) ||
    (isAnonymous ? "익명" : null);
  if (!authorName) {
    return {
      ok: false,
      error: "작성자 이름이 필요합니다.",
      field: "authorName",
    };
  }
  let authorEmail: string | null = null;
  if (typeof input.authorEmail === "string" && input.authorEmail.trim()) {
    const e = input.authorEmail.trim();
    if (!EMAIL_RE.test(e)) {
      return { ok: false, error: "올바른 이메일을 입력해주세요.", field: "authorEmail" };
    }
    authorEmail = e;
  }
  return {
    ok: true,
    value: {
      category: cat as CommunityCategory,
      title,
      body,
      authorName,
      authorEmail,
      isAnonymous,
    },
  };
}

export type ValidateCommentInput = {
  body?: unknown;
  authorName?: unknown;
  isAnonymous?: unknown;
};

export type ValidatedCommentInput = {
  body: string;
  authorName: string;
  isAnonymous: boolean;
};

export function validateCommunityCommentInput(
  input: ValidateCommentInput,
): Result<ValidatedCommentInput> {
  if (typeof input.body !== "string") {
    return { ok: false, error: "댓글이 비어있습니다.", field: "body" };
  }
  const body = input.body.trim();
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
  const isAnonymous = input.isAnonymous === true || input.isAnonymous === "true";
  const authorName =
    asString(input.authorName, COMMUNITY_LIMITS.AUTHOR_NAME_MAX) ||
    (isAnonymous ? "익명" : null);
  if (!authorName) {
    return {
      ok: false,
      error: "작성자 이름이 필요합니다.",
      field: "authorName",
    };
  }
  return { ok: true, value: { body, authorName, isAnonymous } };
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
