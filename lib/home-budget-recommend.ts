import type { MediaItem } from "@/lib/media-data";
import {
  recommendMedia,
  type AiRecommendInput,
  type Industry,
  type ScoredMedia,
} from "@/lib/ai-media-recommend";

export type HomeBudgetRegion =
  | "gangnam"
  | "hongdae"
  | "seongsu"
  | "downtown"
  | "national";

export type HomeBudgetIndustry =
  | ""
  | "beauty"
  | "fnb"
  | "it"
  | "fashion"
  | "other";

const REGION_CONFIG: Record<
  HomeBudgetRegion,
  { region: string; locationKeywords: string[] | null }
> = {
  gangnam: {
    region: "seoul",
    locationKeywords: ["강남", "서초", "역삼", "테헤란", "삼성", "코엑스"],
  },
  hongdae: {
    region: "seoul",
    locationKeywords: ["홍대", "합정", "마포", "신촌", "상수"],
  },
  seongsu: {
    region: "seoul",
    locationKeywords: ["성수", "뚝섬", "서울숲", "건대"],
  },
  downtown: {
    region: "seoul",
    locationKeywords: [
      "명동",
      "을지로",
      "종로",
      "시청",
      "광화문",
      "동대문",
      "중구",
      "도심",
    ],
  },
  national: { region: "all", locationKeywords: null },
};

const INDUSTRY_MAP: Record<HomeBudgetIndustry, Industry> = {
  "": "other",
  beauty: "beauty",
  fnb: "fmcg",
  it: "fintech",
  fashion: "retail",
  other: "other",
};

export function buildHomeBudgetRecommendInput(
  budgetMan: number,
  region: HomeBudgetRegion,
  industry: HomeBudgetIndustry = "",
): AiRecommendInput {
  const cfg = REGION_CONFIG[region];
  return {
    goal: "awareness",
    target: "mass",
    budgetMaxMan: budgetMan,
    region: cfg.region,
    industry: INDUSTRY_MAP[industry],
    locationKeywords: cfg.locationKeywords,
  };
}

export function previewHomeBudgetMedia(
  catalog: readonly MediaItem[],
  budgetMan: number,
  region: HomeBudgetRegion,
  industry: HomeBudgetIndustry = "",
  limit = 3,
): ScoredMedia[] {
  const input = buildHomeBudgetRecommendInput(budgetMan, region, industry);
  return recommendMedia(input, catalog).slice(0, limit);
}

export function recommendUrlFromHomeBudget(
  budgetMan: number,
  region: HomeBudgetRegion,
  industry: HomeBudgetIndustry = "",
): string {
  const qs = new URLSearchParams();
  qs.set("budget", String(budgetMan));
  qs.set("region", region);
  if (industry) qs.set("industry", industry);
  qs.set("auto", "1");
  return `/recommend?${qs.toString()}`;
}
