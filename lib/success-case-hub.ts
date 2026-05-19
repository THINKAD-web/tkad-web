import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";
import { formatCaseStudyMetricValue } from "@/lib/campaign-case-study";

/** 정규화 필터 코드 (UI·매칭용) */
export type CaseIndustryTag =
  | "beauty"
  | "fashion"
  | "fnb"
  | "tech"
  | "finance"
  | "entertainment"
  | "realestate";

export type CaseMediaTag = "billboard" | "subway" | "bus" | "dooh";

export type CaseRegionTag =
  | "gangnam"
  | "hongdae"
  | "seongsu"
  | "urban"
  | "nationwide";

export type CaseBudgetTag = "small" | "medium" | "large";

export type CaseFilterState = {
  industries: Set<CaseIndustryTag>;
  mediaTypes: Set<CaseMediaTag>;
  regions: Set<CaseRegionTag>;
  budgets: Set<CaseBudgetTag>;
};

export const CASE_INDUSTRY_TAGS: CaseIndustryTag[] = [
  "beauty",
  "fashion",
  "fnb",
  "tech",
  "finance",
  "entertainment",
  "realestate",
];

export const CASE_MEDIA_TAGS: CaseMediaTag[] = [
  "billboard",
  "subway",
  "bus",
  "dooh",
];

export const CASE_REGION_TAGS: CaseRegionTag[] = [
  "gangnam",
  "hongdae",
  "seongsu",
  "urban",
  "nationwide",
];

export const CASE_BUDGET_TAGS: CaseBudgetTag[] = ["small", "medium", "large"];

export type InferredCaseTags = {
  industries: CaseIndustryTag[];
  mediaTypes: CaseMediaTag[];
  regions: CaseRegionTag[];
  budget: CaseBudgetTag | null;
};

function haystack(item: PublicSuccessCaseListItem): string {
  return [
    item.industry,
    item.clientName,
    item.titleKo,
    item.titleEn ?? "",
    item.summaryKo,
    item.budgetRange ?? "",
    ...item.mediaUsed,
  ]
    .join(" ")
    .toLowerCase();
}

function matchAny(hay: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(hay));
}

export function inferCaseTags(item: PublicSuccessCaseListItem): InferredCaseTags {
  const hay = haystack(item);

  const industries: CaseIndustryTag[] = [];
  if (matchAny(hay, [/뷰티|beauty|화장|스킨|코스메/])) industries.push("beauty");
  if (matchAny(hay, [/패션|fashion|의류|apparel/])) industries.push("fashion");
  if (
    matchAny(hay, [
      /f&b|fnb|식음|음식|카페|레스토랑|fb\b|food|beverage|맥주/,
    ])
  )
    industries.push("fnb");
  if (matchAny(hay, [/테크|tech|it\b|saas|스타트업|b2b|디지털/]))
    industries.push("tech");
  if (matchAny(hay, [/금융|finance|은행|보험|핀테크|fintech/]))
    industries.push("finance");
  if (matchAny(hay, [/엔터|entertainment|게임|공연|영화|k-pop|kpop/]))
    industries.push("entertainment");
  if (matchAny(hay, [/부동산|realestate|real estate|분양|아파트/]))
    industries.push("realestate");

  if (industries.length === 0) {
    const ind = item.industry.toLowerCase();
    if (/beauty|뷰티/.test(ind)) industries.push("beauty");
    else if (/fashion|패션/.test(ind)) industries.push("fashion");
    else if (/f&b|food|fb/.test(ind)) industries.push("fnb");
    else if (/tech|테크/.test(ind)) industries.push("tech");
    else if (/finance|금융/.test(ind)) industries.push("finance");
    else industries.push("tech");
  }

  const mediaTypes: CaseMediaTag[] = [];
  if (matchAny(hay, [/빌보드|billboard|대형.*간판|옥외/]))
    mediaTypes.push("billboard");
  if (matchAny(hay, [/지하철|subway|역사|플랫폼|metro/]))
    mediaTypes.push("subway");
  if (matchAny(hay, [/버스|bus|정류|shelter/])) mediaTypes.push("bus");
  if (
    matchAny(hay, [
      /dooh|디지털|digital|사이니지|signage|led|미디어월|스크린/,
    ])
  )
    mediaTypes.push("dooh");

  if (mediaTypes.length === 0) mediaTypes.push("billboard");

  const regions: CaseRegionTag[] = [];
  if (matchAny(hay, [/강남|gangnam|선릉|역삼|테헤란|삼성역|코엑스/]))
    regions.push("gangnam");
  if (matchAny(hay, [/홍대|hongdae|합정|상수|연남/])) regions.push("hongdae");
  if (matchAny(hay, [/성수|seongsu|뚝섬/])) regions.push("seongsu");
  if (matchAny(hay, [/전국|nationwide|광역|다수 도시/]))
    regions.push("nationwide");
  if (
    matchAny(hay, [
      /도심|cbd|시청|광화문|을지로|명동|종로|여의도|잠실/,
    ])
  )
    regions.push("urban");

  if (regions.length === 0) regions.push("gangnam");

  return {
    industries,
    mediaTypes,
    regions,
    budget: inferBudgetTier(item.budgetRange),
  };
}

/** 예산 문자열 → 티어 (만원 기준) */
export function inferBudgetTier(
  budgetRange: string | null,
): CaseBudgetTag | null {
  if (!budgetRange?.trim()) return null;
  const digits = budgetRange.replace(/[^\d]/g, "");
  if (!digits) return "medium";

  const nums: number[] = [];
  const parts = budgetRange.match(/[\d,.]+/g) ?? [];
  for (const p of parts) {
    let n = Number(p.replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) continue;
    if (budgetRange.includes("억") && !budgetRange.includes("만")) n *= 10_000;
    nums.push(n);
  }
  const maxMan = nums.length > 0 ? Math.max(...nums) : null;

  if (maxMan == null) return "medium";
  if (maxMan <= 500) return "small";
  if (maxMan <= 3000) return "medium";
  return "large";
}

export function matchesCaseFilters(
  item: PublicSuccessCaseListItem,
  filters: CaseFilterState,
  query: string,
): boolean {
  const tags = inferCaseTags(item);

  if (
    filters.industries.size > 0 &&
    !tags.industries.some((t) => filters.industries.has(t))
  ) {
    return false;
  }
  if (
    filters.mediaTypes.size > 0 &&
    !tags.mediaTypes.some((t) => filters.mediaTypes.has(t))
  ) {
    return false;
  }
  if (
    filters.regions.size > 0 &&
    !tags.regions.some((t) => filters.regions.has(t))
  ) {
    return false;
  }
  if (filters.budgets.size > 0) {
    const tier = tags.budget ?? "medium";
    if (!filters.budgets.has(tier)) return false;
  }

  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack(item).includes(q);
}

export function buildCaseHeadline(
  item: PublicSuccessCaseListItem,
  locale: string,
): string | null {
  const isKo = locale !== "en";
  const metrics = item.highlightMetrics;
  if (metrics.length === 0) return null;

  const imp = metrics.find((m) => m.key === "impressions");
  const cpm = metrics.find((m) => m.key === "cpm");
  const parts: string[] = [];

  if (imp) {
    const v = formatCaseStudyMetricValue(imp, locale);
    parts.push(isKo ? `월 노출 ${v}` : `Monthly impressions ${v}`);
  }
  if (cpm) {
    const v = formatCaseStudyMetricValue(cpm, locale);
    parts.push(`CPM ${v}`);
  }
  if (parts.length === 0 && metrics[0]) {
    const m = metrics[0];
    parts.push(
      `${isKo ? m.labelKo : m.labelEn} ${formatCaseStudyMetricValue(m, locale)}`,
    );
  }
  return parts.join(isKo ? ", " : " · ");
}

export function primaryRegionLabel(
  item: PublicSuccessCaseListItem,
  isKo: boolean,
): string | null {
  const tag = inferCaseTags(item).regions[0];
  const labels: Record<CaseRegionTag, { ko: string; en: string }> = {
    gangnam: { ko: "강남", en: "Gangnam" },
    hongdae: { ko: "홍대", en: "Hongdae" },
    seongsu: { ko: "성수", en: "Seongsu" },
    urban: { ko: "도심", en: "Urban core" },
    nationwide: { ko: "전국", en: "Nationwide" },
  };
  const L = labels[tag];
  return L ? (isKo ? L.ko : L.en) : null;
}

export function scoreSimilarCases(
  current: PublicSuccessCaseListItem,
  pool: PublicSuccessCaseListItem[],
  limit = 3,
): PublicSuccessCaseListItem[] {
  const curTags = inferCaseTags(current);
  const scored = pool
    .filter((c) => c.id !== current.id)
    .map((c) => {
      const t = inferCaseTags(c);
      let score = 0;
      for (const i of curTags.industries) {
        if (t.industries.includes(i)) score += 3;
      }
      for (const m of curTags.mediaTypes) {
        if (t.mediaTypes.includes(m)) score += 2;
      }
      for (const r of curTags.regions) {
        if (t.regions.includes(r)) score += 2;
      }
      if (curTags.budget && t.budget === curTags.budget) score += 1;
      if (c.industry === current.industry) score += 1;
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const picked = scored.slice(0, limit).map((x) => x.c);
  if (picked.length >= limit) return picked;

  const fill = pool
    .filter((c) => c.id !== current.id && !picked.some((p) => p.id === c.id))
    .slice(0, limit - picked.length);
  return [...picked, ...fill];
}

export function emptyCaseFilters(): CaseFilterState {
  return {
    industries: new Set(),
    mediaTypes: new Set(),
    regions: new Set(),
    budgets: new Set(),
  };
}

export function hasActiveCaseFilters(filters: CaseFilterState, query: string) {
  return (
    query.trim().length > 0 ||
    filters.industries.size > 0 ||
    filters.mediaTypes.size > 0 ||
    filters.regions.size > 0 ||
    filters.budgets.size > 0
  );
}
