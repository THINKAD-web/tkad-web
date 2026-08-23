/**
 * Brief 업종 보너스 — 평균 축과 분리 (P1).
 * Strong haystack: name + subCategory + tags (description/features 제외).
 */

import type { MediaItem } from "@/lib/media-data";
import { briefIndustryToPlanner } from "@/lib/planner/brief/brief-integrated-adapters";
import { PLANNER_INDUSTRY_TO_MATCHING } from "@/lib/planner/industry-match";
import type { BriefIndustry } from "@/lib/planner/brief/types";

export type IndustryMatchTier = "strong" | "medium" | "weak";

export const INDUSTRY_STRONG_BONUS = 15;
export const INDUSTRY_MEDIUM_BONUS = 6;

const STRONG_KEYWORDS: Record<
  Exclude<BriefIndustry, "other">,
  RegExp
> = {
  fb: /푸드코트|먹자골목|요식|식음료|레스토랑|베이커리|카페|주점|디저트|맛집|bakery|restaurant|food hall|dining|이마트24|편의점|\bcu\b|gs25|서브웨이|스타벅스|치킨|피자|버거/i,
  retail:
    /백화점|쇼핑몰|아울렛|매장|retail|mall|department|boutique|뷰티|beauty|cosmetic|패션|fashion|팝업|popup/i,
  tech: /테크|saas|앱|software|ict|스타트업|startup|판교/i,
  finance: /금융|은행|증권|보험|fintech|finance|여의도|테헤란/i,
  ent: /k-pop|kpop|콘서트|공연|엔터|영화|게임|fan|fandom/i,
};

const MEDIUM_MEDIA_TYPES: Record<string, readonly string[]> = {
  fnb: ["mobile", "static", "subway", "digital"],
  retail: ["digital", "static", "mobile"],
  tech: ["digital", "mobile", "subway"],
  finance: ["digital", "static"],
  entertainment: ["digital", "mobile"],
  other: [],
};

/** 업종 Strong 판정용 — 지역·description 제외 */
export function industryContentHaystack(media: MediaItem): string {
  return [media.name, media.subCategory, ...(media.tags ?? [])]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

export function classifyBriefIndustryMatch(
  media: MediaItem,
  industry: BriefIndustry,
): IndustryMatchTier {
  if (industry === "other") return "weak";

  const hay = industryContentHaystack(media);
  if (STRONG_KEYWORDS[industry].test(hay)) return "strong";

  const plannerKey = briefIndustryToPlanner(industry);
  const matchingKey = PLANNER_INDUSTRY_TO_MATCHING[plannerKey];
  const types = MEDIUM_MEDIA_TYPES[matchingKey] ?? [];
  const type = (media.type ?? "").toLowerCase();
  if (types.some((t) => type.includes(t) || type === t)) return "medium";

  return "weak";
}

export function industryBonusForTier(tier: IndustryMatchTier): number {
  switch (tier) {
    case "strong":
      return INDUSTRY_STRONG_BONUS;
    case "medium":
      return INDUSTRY_MEDIUM_BONUS;
    default:
      return 0;
  }
}

/** UI 축 점수 (근거 라벨용, 평균에는 미포함) */
export function industryAxisDisplayScore(tier: IndustryMatchTier): number {
  switch (tier) {
    case "strong":
      return 100;
    case "medium":
      return 65;
    default:
      return 25;
  }
}

export function countIndustryTiers(
  candidates: readonly MediaItem[],
  industry: BriefIndustry,
): {
  strong: number;
  medium: number;
  weak: number;
  total: number;
  strongPct: number;
} {
  let strong = 0;
  let medium = 0;
  let weak = 0;
  for (const m of candidates) {
    const tier = classifyBriefIndustryMatch(m, industry);
    if (tier === "strong") strong++;
    else if (tier === "medium") medium++;
    else weak++;
  }
  const total = candidates.length;
  return {
    strong,
    medium,
    weak,
    total,
    strongPct: total > 0 ? Math.round((strong / total) * 1000) / 10 : 0,
  };
}
