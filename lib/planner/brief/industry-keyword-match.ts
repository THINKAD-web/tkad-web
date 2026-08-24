/**
 * Brief 업종 키워드 — 태그 exact match + name/subCategory 안전 substring.
 * `mall` in `target:small_business`, `앱` in `디앱스` 같은 오매칭 방지.
 */

import type { MediaItem } from "@/lib/media-data";

export type KeywordTier = "strong" | "medium" | "none";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** ASCII 짧은 토큰 — underscore 붙은 태그 값에서 substring 방지 */
function asciiTokenIncludes(text: string, term: string): boolean {
  const re = new RegExp(
    `(?:^|[^a-z0-9_])${escapeRegExp(term.toLowerCase())}(?:$|[^a-z0-9_])`,
    "i",
  );
  return re.test(text.toLowerCase());
}

/** 한글 1~2음절 키워드 — 복합어(디앱스) 안에 묻히지 않게 토큰 경계 */
function koreanShortTokenIncludes(text: string, term: string): boolean {
  const re = new RegExp(
    `(?:^|[\\s·,/|()\\[\\]])${escapeRegExp(term)}(?:$|[\\s·,/|()\\[\\]])`,
  );
  return re.test(text);
}

export function textFieldIncludesTerm(field: string, term: string): boolean {
  const t = term.trim();
  if (!t) return false;
  if (/^[a-z0-9]+$/i.test(t)) {
    return asciiTokenIncludes(field, t);
  }
  if (t.length <= 2 && /[가-힣]/.test(t)) {
    return koreanShortTokenIncludes(field, t);
  }
  return field.toLowerCase().includes(t.toLowerCase());
}

export function tagEquals(tag: string, allowed: string): boolean {
  return tag.trim().toLowerCase() === allowed.trim().toLowerCase();
}

export function tagInSet(tag: string, allowed: readonly string[]): boolean {
  const n = tag.trim().toLowerCase();
  return allowed.some((a) => n === a.trim().toLowerCase());
}

export type IndustryKeywordConfig = {
  strongTextTerms: readonly string[];
  strongExactTags?: readonly string[];
  mediumTextTerms?: readonly string[];
  mediumExactTags?: readonly string[];
};

export function matchKeywordTierInMedia(
  media: MediaItem,
  config: IndustryKeywordConfig,
): KeywordTier {
  const name = media.name ?? "";
  const sub = media.subCategory ?? "";
  const tags = (media.tags ?? []).filter(
    (t): t is string => typeof t === "string" && t.trim().length > 0,
  );

  if (config.strongExactTags?.length) {
    for (const tag of tags) {
      if (tagInSet(tag, config.strongExactTags)) return "strong";
    }
  }

  for (const term of config.strongTextTerms) {
    if (textFieldIncludesTerm(name, term) || textFieldIncludesTerm(sub, term)) {
      return "strong";
    }
    for (const tag of tags) {
      if (tagEquals(tag, term)) return "strong";
      if (textFieldIncludesTerm(tag, term)) return "strong";
    }
  }

  if (config.mediumExactTags?.length) {
    for (const tag of tags) {
      if (tagInSet(tag, config.mediumExactTags)) return "medium";
    }
  }

  for (const term of config.mediumTextTerms ?? []) {
    if (textFieldIncludesTerm(name, term) || textFieldIncludesTerm(sub, term)) {
      return "medium";
    }
    for (const tag of tags) {
      if (tagEquals(tag, term)) return "medium";
      if (textFieldIncludesTerm(tag, term)) return "medium";
    }
  }

  return "none";
}

/** retail — 운영 주체 Strong, 뷰티·패션 Medium, mall은 exact tag만 */
export const RETAIL_KEYWORDS: IndustryKeywordConfig = {
  strongTextTerms: [
    "백화점",
    "쇼핑몰",
    "아울렛",
    "매장",
    "retail",
    "department",
    "boutique",
    "팝업",
    "popup",
  ],
  strongExactTags: ["shopping_mall", "mall", "department_store"],
  mediumTextTerms: ["뷰티", "beauty", "cosmetic", "패션", "fashion"],
};

/** tech — 제안 A (디지털·IT·AI·핀테크·강남역 geo 제외) */
export const TECH_KEYWORDS: IndustryKeywordConfig = {
  strongTextTerms: [
    "테크",
    "saas",
    "software",
    "ict",
    "스타트업",
    "startup",
    "판교",
    "판교테크노밸리",
    "테헤란로",
    "정보기술",
    "인공지능",
    "빅데이터",
    "클라우드",
    "플랫폼",
    "개발자",
    "스타트업밸리",
    "유니콘",
    "실리콘밸리",
    "성수",
    "앱",
  ],
};
