/**
 * Community 도메인 — types / categories / 상수.
 *
 * server / client 양쪽 import 가능 (Prisma 직접 import X, getPrisma 는 queries.ts 만).
 */

export const COMMUNITY_CATEGORIES = [
  "notice",
  "free",
  "media_recommend",
  "execution_review",
  "collaboration",
] as const;
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export const COMMUNITY_CATEGORY_LABELS: Record<
  CommunityCategory,
  {
    emoji: string;
    ko: string;
    en: string;
    shortKo: string;
    description: { ko: string; en: string };
  }
> = {
  notice: {
    emoji: "📢",
    ko: "공지사항",
    en: "Notices",
    shortKo: "공지",
    description: {
      ko: "THINKAD 운영팀 공지 및 업데이트",
      en: "Official THINKAD announcements and updates",
    },
  },
  free: {
    emoji: "💬",
    ko: "자유게시판",
    en: "Open Board",
    shortKo: "자유",
    description: {
      ko: "OOH 실무 팁, 질문, 업계 이야기를 자유롭게 나누는 공간",
      en: "Share OOH tips, questions, and industry conversations",
    },
  },
  media_recommend: {
    emoji: "🔍",
    ko: "매체 추천 요청",
    en: "Media Recommendations",
    shortKo: "매체 추천",
    description: {
      ko: "예산·지역·업종을 입력하면 AI가 추천 매체 3곳을 안내합니다",
      en: "Enter budget, region, and industry — AI suggests 3 matching media",
    },
  },
  execution_review: {
    emoji: "📊",
    ko: "집행 후기",
    en: "Execution Reviews",
    shortKo: "집행 후기",
    description: {
      ko: "실제 집행 경험 공유 — 매체 리뷰로도 등록되며 200P 지급",
      en: "Share flight outcomes — also posted as a media review (+200P)",
    },
  },
  collaboration: {
    emoji: "🤝",
    ko: "협업 구해요",
    en: "Collaboration",
    shortKo: "협업",
    description: {
      ko: "공동 구매, 파트너, 대행 협업 파트너를 찾는 게시판",
      en: "Find co-buy partners, agencies, and collaboration opportunities",
    },
  },
};

/** DB·URL 레거시 카테고리 → 현재 카테고리 */
const COMMUNITY_CATEGORY_ALIASES: Record<string, CommunityCategory> = {
  insight: "free",
  qna: "free",
  qa: "free",
  review: "execution_review",
  networking: "collaboration",
  recommend: "media_recommend",
};

export function normalizeCommunityCategory(value: unknown): CommunityCategory | null {
  if (typeof value !== "string") return null;
  if ((COMMUNITY_CATEGORIES as readonly string[]).includes(value)) {
    return value as CommunityCategory;
  }
  return COMMUNITY_CATEGORY_ALIASES[value] ?? null;
}

/** Prisma where 절 — 레거시 DB 값 포함 */
export function resolveCommunityCategoryWhere(
  category: CommunityCategory,
): string | { in: string[] } {
  switch (category) {
    case "free":
      return { in: ["free", "insight", "qna", "qa"] };
    case "media_recommend":
      return { in: ["media_recommend", "recommend"] };
    case "execution_review":
      return { in: ["execution_review", "review"] };
    case "collaboration":
      return { in: ["collaboration", "networking"] };
    default:
      return category;
  }
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
  bodyExcerpt: string;
  authorName: string;
  isAnonymous: boolean;
  author: CommunityAuthorSummary | null;
  status: CommunityPostStatus;
  reportCount: number;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  isPinned?: boolean;
  createdAt: string;
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
  joinedAt: string;
};

export const COMMUNITY_REGION_OPTIONS = [
  { value: "seoul_gangnam", ko: "서울 강남·테헤란", en: "Seoul Gangnam" },
  { value: "seoul_hongdae", ko: "서울 홍대·마포", en: "Seoul Hongdae" },
  { value: "seoul", ko: "서울 전역", en: "Seoul" },
  { value: "busan", ko: "부산", en: "Busan" },
  { value: "jeju", ko: "제주", en: "Jeju" },
  { value: "national", ko: "전국", en: "Nationwide" },
] as const;

export const COMMUNITY_INDUSTRY_OPTIONS = [
  { value: "indFb", ko: "F&B·식음료", en: "F&B" },
  { value: "indRetail", ko: "리테일·유통", en: "Retail" },
  { value: "indTech", ko: "IT·테크", en: "Tech" },
  { value: "indFinance", ko: "금융", en: "Finance" },
  { value: "indEnt", ko: "엔터·문화", en: "Entertainment" },
  { value: "indOther", ko: "기타", en: "Other" },
] as const;

// ── 정책 상수 ──
export const COMMUNITY_LIMITS = {
  POST_TITLE_MAX: 200,
  POST_BODY_MIN: 10,
  POST_BODY_MAX: 10_000,
  COMMENT_BODY_MIN: 1,
  COMMENT_BODY_MAX: 500,
  AUTHOR_NAME_MAX: 50,
  EXCERPT_LEN: 180,
  REPORT_AUTO_HIDE_THRESHOLD: 3,
  ANON_POST_PER_HOUR: 5,
  ANON_COMMENT_PER_HOUR: 20,
  USER_POST_PER_HOUR: 20,
  USER_COMMENT_PER_HOUR: 60,
  USER_REPORT_PER_HOUR: 40,
  PAGE_SIZE: 20,
  HOME_SECTION_SIZE: 3,
  MEMBER_DIRECTORY_PAGE_SIZE: 20,
  PROFILE_BIO_MAX: 500,
  PROFILE_REGION_MAX: 40,
} as const;
