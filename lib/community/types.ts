/**
 * Community 도메인 — types / categories / 상수.
 *
 * server / client 양쪽 import 가능 (Prisma 직접 import X, getPrisma 는 queries.ts 만).
 */

export const COMMUNITY_CATEGORIES = [
  "insight",
  "qna",
  "networking",
  "review",
] as const;
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export const COMMUNITY_CATEGORY_LABELS: Record<
  CommunityCategory,
  {
    ko: string;
    en: string;
    shortKo: string;
    description: { ko: string; en: string };
  }
> = {
  insight: {
    ko: "인사이트",
    en: "Insights",
    shortKo: "인사이트",
    description: {
      ko: "OOH 업계 트렌드, 데이터, 운영 인사이트를 나누는 공간",
      en: "Share OOH industry trends, data, and field insights",
    },
  },
  qna: {
    ko: "질문 · 토론",
    en: "Q&A",
    shortKo: "질문/토론",
    description: {
      ko: "매체 선정, 단가, 진행 방식에 대한 질문과 답변",
      en: "Ask and answer questions on media selection, costs, and execution",
    },
  },
  networking: {
    ko: "네트워킹",
    en: "Networking",
    shortKo: "네트워킹",
    description: {
      ko: "협업 파트너를 찾고 업계 연결을 만드는 커뮤니티",
      en: "Find collaborators and build relationships across the OOH industry",
    },
  },
  review: {
    ko: "캠페인 후기",
    en: "Campaign Reviews",
    shortKo: "캠페인 후기",
    description: {
      ko: "실제 집행 경험, 성과, 시행착오를 공유하는 후기",
      en: "Share execution outcomes, lessons learned, and campaign reviews",
    },
  },
};

const COMMUNITY_CATEGORY_ALIASES: Record<string, CommunityCategory> = {
  qa: "qna",
  recommend: "networking",
};

export function normalizeCommunityCategory(value: unknown): CommunityCategory | null {
  if (typeof value !== "string") return null;
  if ((COMMUNITY_CATEGORIES as readonly string[]).includes(value)) {
    return value as CommunityCategory;
  }
  return COMMUNITY_CATEGORY_ALIASES[value] ?? null;
}

export const COMMUNITY_MEMBER_ROLES = [
  "ADVERTISER",
  "MEDIA",
  "AGENCY",
  "FREELANCER",
] as const;
export type CommunityMemberRole = (typeof COMMUNITY_MEMBER_ROLES)[number];

/** 멤버 디렉터리 지역 탭 (전체 제외) */
export const COMMUNITY_DIRECTORY_REGION_OPTIONS = [
  "서울",
  "부산",
  "대구",
  "기타",
] as const;

export const COMMUNITY_MEMBER_ROLE_LABELS: Record<
  CommunityMemberRole,
  { ko: string; en: string; accentClassName: string; surfaceClassName: string }
> = {
  ADVERTISER: {
    ko: "광고주",
    en: "Advertiser",
    accentClassName: "border-[#3B82F6]/60 text-[#DBEAFE]",
    surfaceClassName: "border-[#3B82F6]/50 bg-[#3B82F6]/15 text-[#DBEAFE]",
  },
  MEDIA: {
    ko: "매체사",
    en: "Media",
    accentClassName: "border-[#10B981]/60 text-[#D1FAE5]",
    surfaceClassName: "border-[#10B981]/50 bg-[#10B981]/15 text-[#D1FAE5]",
  },
  AGENCY: {
    ko: "대행사",
    en: "Agency",
    accentClassName: "border-[#FF6600]/60 text-[#FFEDD5]",
    surfaceClassName: "border-[#FF6600]/50 bg-[#FF6600]/15 text-[#FFEDD5]",
  },
  FREELANCER: {
    ko: "프리랜서",
    en: "Freelancer",
    accentClassName: "border-[#8B5CF6]/60 text-[#EDE9FE]",
    surfaceClassName: "border-[#8B5CF6]/50 bg-[#8B5CF6]/15 text-[#EDE9FE]",
  },
};

export function normalizeCommunityMemberRole(
  value: unknown,
): CommunityMemberRole | null {
  if (typeof value !== "string") return null;
  if ((COMMUNITY_MEMBER_ROLES as readonly string[]).includes(value)) {
    return value as CommunityMemberRole;
  }
  return null;
}

export function fallbackCommunityRoleFromAppRole(
  role: string | null | undefined,
): CommunityMemberRole | null {
  if (role === "advertiser") return "ADVERTISER";
  if (role === "agency") return "AGENCY";
  if (role === "owner") return "MEDIA";
  if (role === "admin") return "FREELANCER";
  return null;
}

export type CommunityAuthorSummary = {
  id: string;
  name: string;
  company: string | null;
  role: CommunityMemberRole | null;
  bio: string | null;
  region: string | null;
};

export type CommunityPostStatus = "published" | "hidden" | "deleted";

export type CommunityPostListItem = {
  id: string;
  category: CommunityCategory;
  title: string;
  bodyExcerpt: string; // 본문 첫 N자
  authorName: string;
  isAnonymous: boolean;
  author: CommunityAuthorSummary | null;
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
  likedByMe: boolean;
  bookmarkedByMe: boolean;
  comments: CommunityCommentItem[];
};

export type CommunityCommentItem = {
  id: string;
  body: string;
  authorName: string;
  isAnonymous: boolean;
  author: CommunityAuthorSummary | null;
  status: CommunityPostStatus;
  reportCount: number;
  createdAt: string;
  editableByMe: boolean;
};

export type CommunityMemberListItem = CommunityAuthorSummary & {
  postCount: number;
  commentCount: number;
  latestActivityAt: string | null;
  /** 계정 생성일 (가입일) */
  joinedAt: string;
};

// ── 정책 상수 ──
export const COMMUNITY_LIMITS = {
  POST_TITLE_MAX: 200,
  POST_BODY_MIN: 10,
  POST_BODY_MAX: 10_000,
  COMMENT_BODY_MIN: 1,
  COMMENT_BODY_MAX: 500,
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
  USER_REPORT_PER_HOUR: 40,
  /** 페이지 당 글 수 */
  PAGE_SIZE: 20,
  /** 홈 섹션 카드 수 */
  HOME_SECTION_SIZE: 3,
  /** 멤버 디렉터리 페이지 크기 */
  MEMBER_DIRECTORY_PAGE_SIZE: 20,
  /** 프로필 한 줄 소개 */
  PROFILE_BIO_MAX: 500,
  /** 프로필 지역 문자열 */
  PROFILE_REGION_MAX: 40,
} as const;
