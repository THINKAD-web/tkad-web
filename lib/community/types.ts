/**
 * Community 도메인 — types / categories / 상수.
 *
 * server / client 양쪽 import 가능 (Prisma 직접 import X, getPrisma 는 queries.ts 만).
 */

export const COMMUNITY_CATEGORIES = ["qa", "review", "recommend"] as const;
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export const COMMUNITY_CATEGORY_LABELS: Record<
  CommunityCategory,
  { ko: string; en: string; description: { ko: string; en: string } }
> = {
  qa: {
    ko: "Q&A",
    en: "Q&A",
    description: {
      ko: "OOH 광고 진행 / 매체 선정 / 비용에 대한 질문과 답변",
      en: "Questions and answers on OOH campaigns, media selection, costs",
    },
  },
  review: {
    ko: "매체 후기",
    en: "Media reviews",
    description: {
      ko: "직접 집행한 OOH 매체에 대한 후기와 평가",
      en: "Reviews and ratings of OOH media you've used",
    },
  },
  recommend: {
    ko: "매체 추천",
    en: "Recommendations",
    description: {
      ko: "캠페인 목표·예산에 맞는 매체 추천을 다른 광고주에게 요청",
      en: "Ask the community for media recommendations matching your campaign",
    },
  },
};

export type CommunityPostStatus = "published" | "hidden" | "deleted";

export type CommunityPostListItem = {
  id: string;
  category: CommunityCategory;
  title: string;
  bodyExcerpt: string; // 본문 첫 N자
  authorName: string;
  isAnonymous: boolean;
  status: CommunityPostStatus;
  reportCount: number;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  createdAt: string; // ISO
  updatedAt: string;
};

export type CommunityPostDetail = CommunityPostListItem & {
  body: string;
  comments: CommunityCommentItem[];
};

export type CommunityCommentItem = {
  id: string;
  body: string;
  authorName: string;
  isAnonymous: boolean;
  status: CommunityPostStatus;
  reportCount: number;
  createdAt: string;
};

// ── 정책 상수 ──
export const COMMUNITY_LIMITS = {
  POST_TITLE_MAX: 200,
  POST_BODY_MIN: 10,
  POST_BODY_MAX: 10_000,
  COMMENT_BODY_MIN: 2,
  COMMENT_BODY_MAX: 2_000,
  AUTHOR_NAME_MAX: 50,
  EXCERPT_LEN: 180,
  /** 신고 누적 시 자동 hidden */
  REPORT_AUTO_HIDE_THRESHOLD: 3,
  /** 익명 글: IP 당 시간당 글 한도 */
  ANON_POST_PER_HOUR: 5,
  /** 익명 댓글: IP 당 시간당 댓글 한도 */
  ANON_COMMENT_PER_HOUR: 20,
  /** 가입 사용자: 글/댓글 모두 시간당 한도 (관대) */
  USER_POST_PER_HOUR: 20,
  USER_COMMENT_PER_HOUR: 60,
  /** 페이지 당 글 수 */
  PAGE_SIZE: 20,
} as const;
