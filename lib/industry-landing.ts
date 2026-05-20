import type { MediaItem } from "@/lib/media-data";
import { passesMediaPrecisionFilters } from "@/lib/media-precision-filter-match";
import type { MediaCatalogFiltersState } from "@/lib/use-media-catalog-filters";
import {
  emptyCaseFilters,
  matchesCaseFilters,
  type CaseIndustryTag,
} from "@/lib/success-case-hub";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";

/** URL 슬러그 — `/industry/[slug]` */
export const INDUSTRY_SLUGS = [
  "beauty",
  "fashion",
  "food",
  "tech",
  "finance",
  "entertainment",
  "retail",
] as const;

export type IndustrySlug = (typeof INDUSTRY_SLUGS)[number];

export function isIndustrySlug(value: string): value is IndustrySlug {
  return (INDUSTRY_SLUGS as readonly string[]).includes(value);
}

type IndustryMediaConfig = {
  precisionKeys: string[];
  extraPatterns: RegExp[];
  fallbackPatterns: RegExp[];
};

const INDUSTRY_MEDIA: Record<IndustrySlug, IndustryMediaConfig> = {
  beauty: {
    precisionKeys: ["fashion_beauty"],
    extraPatterns: [/뷰티|beauty|화장|코스메|스킨케어|skincare|미용/i],
    fallbackPatterns: [/강남|홍대|성수|압구정|신사|코엑스/i],
  },
  fashion: {
    precisionKeys: ["fashion_beauty"],
    extraPatterns: [/패션|fashion|의류|apparel|스트릿|럭셔리\s*패션/i],
    fallbackPatterns: [/강남|홍대|성수|명동|가로수/i],
  },
  food: {
    precisionKeys: ["fnb"],
    extraPatterns: [/식음|f&b|fnb|카페|외식|맥주|주류|프랜차이즈/i],
    fallbackPatterns: [/강남|홍대|신촌|대학가|역세권/i],
  },
  tech: {
    precisionKeys: ["auto_tech"],
    extraPatterns: [/테크|tech|it\b|saas|앱|app|스타트업|전자|모바일/i],
    fallbackPatterns: [/강남|판교|여의도|테헤란|성수/i],
  },
  finance: {
    precisionKeys: ["finance_realestate"],
    extraPatterns: [/금융|finance|은행|보험|핀테크|증권|카드/i],
    fallbackPatterns: [/강남|여의도|광화문|시청|금융가/i],
  },
  entertainment: {
    precisionKeys: ["entertainment_kpop"],
    extraPatterns: [/엔터|entertainment|k-?pop|공연|콘서트|게임|영화|팬덤/i],
    fallbackPatterns: [/강남|홍대|잠실|코엑스|올림픽공원/i],
  },
  retail: {
    precisionKeys: ["retail"],
    extraPatterns: [/유통|리테일|retail|쇼핑|마트|백화점|편의점|플래그십/i],
    fallbackPatterns: [/강남|명동|홍대|잠실|코엑스/i],
  },
};

const CASE_TAG_BY_SLUG: Record<IndustrySlug, CaseIndustryTag | "retail"> = {
  beauty: "beauty",
  fashion: "fashion",
  food: "fnb",
  tech: "tech",
  finance: "finance",
  entertainment: "entertainment",
  retail: "retail",
};

function emptyPrecisionFilters(
  industryKeys: string[],
): MediaCatalogFiltersState {
  const industryTag = Object.fromEntries(
    industryKeys.map((k) => [k, true]),
  ) as Partial<Record<string, boolean>>;
  return {
    targetAge: {},
    targetTraits: {},
    industry: {},
    size: {},
    duration: {},
    exposureTime: {},
    specialFeature: {},
    areaSpot: {},
    mediaFormat: {},
    targetPersona: {},
    industryTag,
    campaignPurpose: {},
  };
}

function mediaHaystack(m: MediaItem): string {
  const kf = m.keywordFilter;
  const parts: string[] = [
    m.name,
    m.nameEn ?? "",
    m.location,
    m.locationEn ?? "",
    m.region,
    m.district ?? "",
    m.city ?? "",
    m.description ?? "",
    ...(m.tags ?? []),
    ...(kf?.industryLabels ?? []),
    ...(kf?.searchKeywords ?? []),
    ...(kf?.regionLabels ?? []),
  ];
  return parts.join(" ").toLowerCase();
}

function matchesExtraPatterns(m: MediaItem, patterns: RegExp[]): boolean {
  const hay = mediaHaystack(m);
  return patterns.some((p) => p.test(hay));
}

/** 업종 태그·키워드 매칭 → 부족 시 지역 인기 매체 폴백 */
export function filterMediaForIndustry(
  catalog: MediaItem[],
  slug: IndustrySlug,
  limit = 12,
): MediaItem[] {
  const cfg = INDUSTRY_MEDIA[slug];
  const filters = emptyPrecisionFilters(cfg.precisionKeys);

  let matched = catalog.filter(
    (m) =>
      passesMediaPrecisionFilters(m, filters) ||
      matchesExtraPatterns(m, cfg.extraPatterns),
  );

  if (matched.length < 3) {
    const fallback = catalog.filter((m) =>
      matchesExtraPatterns(m, cfg.fallbackPatterns),
    );
    const seen = new Set(matched.map((x) => x.id));
    for (const m of fallback) {
      if (!seen.has(m.id)) {
        matched.push(m);
        seen.add(m.id);
      }
    }
  }

  if (matched.length < 3) {
    const seen = new Set(matched.map((x) => x.id));
    const byTraffic = [...catalog]
      .filter((m) => !seen.has(m.id))
      .sort(
        (a, b) =>
          (b.dailyFootTraffic ?? 0) - (a.dailyFootTraffic ?? 0) ||
          (b.visibilityScore ?? 0) - (a.visibilityScore ?? 0),
      );
    for (const m of byTraffic) {
      matched.push(m);
      seen.add(m.id);
      if (matched.length >= limit) break;
    }
  }

  return matched.slice(0, limit);
}

export function filterCasesForIndustry(
  cases: PublicSuccessCaseListItem[],
  slug: IndustrySlug,
  limit = 3,
): PublicSuccessCaseListItem[] {
  const tag = CASE_TAG_BY_SLUG[slug];

  if (tag === "retail") {
    return cases
      .filter((c) => {
        const hay = [
          c.industry,
          c.titleKo,
          c.summaryKo,
          ...c.mediaUsed,
        ]
          .join(" ")
          .toLowerCase();
        return /유통|리테일|retail|쇼핑|마트|백화점|편의점/.test(hay);
      })
      .slice(0, limit);
  }

  const filters = emptyCaseFilters();
  filters.industries = new Set([tag]);

  const matched = cases
    .filter((c) => matchesCaseFilters(c, filters, ""))
    .slice(0, limit);
  return matched.length > 0 ? matched : cases.slice(0, limit);
}

export function filterMediaByBudgetMan(
  catalog: { price: number }[],
  maxMan: number,
): { price: number }[] {
  if (maxMan <= 0) return catalog;
  return catalog.filter((m) => m.price > 0 && m.price <= maxMan);
}

export const INDUSTRY_BUDGET_SESSION_KEY = "tkad-media-budget-max-man";

export type IndustryMediaTypeKey =
  | "type1"
  | "type2"
  | "type3";

export const INDUSTRY_MEDIA_TYPE_KEYS: IndustryMediaTypeKey[] = [
  "type1",
  "type2",
  "type3",
];
