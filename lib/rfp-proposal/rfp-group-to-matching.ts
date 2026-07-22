import type { MatchingInput } from "@/lib/matching-engine";
import type { FreetextMediaIntent } from "@/lib/recommend/freetext-media-intents";
import type { RfpCampaignMeta, RfpGroup } from "@/lib/rfp-proposal/types";

/** RFP 매칭 기본 월 예산 (원) — 미입력 시 엔진이 과배제하지 않도록 */
export const RFP_DEFAULT_MONTHLY_BUDGET_WON = 50_000_000;

const INDUSTRY_HINTS: { re: RegExp; industry: string }[] = [
  { re: /뷰티|화장품|beauty|cosmetic/i, industry: "beauty" },
  { re: /패션|의류|fashion/i, industry: "fashion" },
  { re: /식음|외식|푸드|카페|f\s*&\s*b|fnb|food/i, industry: "fnb" },
  { re: /금융|핀테크|은행|카드|finance|fintech/i, industry: "finance" },
  { re: /자동차|모빌리티|auto|vehicle/i, industry: "auto" },
  { re: /엔터|게임|게이밍|entertainment|gaming/i, industry: "entertainment" },
  { re: /리테일|유통|retail/i, industry: "retail" },
  { re: /fmcg|생필/i, industry: "fmcg" },
  { re: /테크|it\b|tech|소프트웨어|saas/i, industry: "tech" },
];

const TARGET_HINTS: { re: RegExp; target: string }[] = [
  { re: /관광|tourist|여행객/i, target: "tourist" },
  { re: /직장|오피스|worker|비즈|biz/i, target: "worker" },
  { re: /가족|패밀리|family/i, target: "family" },
  { re: /gen\s*z|젠지|mz|2030|밀레니얼|millennial/i, target: "mz" },
];

/**
 * mediaTypeKeywords → MatchingInput.categories + mediaIntents
 * - 하드 필터는 categories(digital/static/mobile)만
 * - subway/bus_wrap 은 scoreCategory 가점용 intent
 */
export function mapMediaTypeKeywords(keywords: readonly string[]): {
  categories?: string[];
  mediaIntents?: FreetextMediaIntent[];
} {
  const joined = keywords.join(" ");
  if (!joined.trim()) return {};

  const categories = new Set<string>();
  const intents = new Set<FreetextMediaIntent>();

  for (const raw of keywords) {
    const k = raw.trim().toLowerCase();
    if (!k) continue;

    if (
      /psd|스크린도어|스크린\s*도어|지하철|subway|역사/.test(k) ||
      /psd|스크린도어|지하철|subway/.test(raw)
    ) {
      intents.add("subway");
    }
    if (
      /버스|택시|래핑|랩핑|bus\s*wrap|랩핑/.test(k) ||
      /버스|래핑|랩핑|bus\s*wrap/i.test(raw)
    ) {
      intents.add("bus_wrap");
      categories.add("mobile");
    }
    if (
      /dooh|디지털|사이니지|스크린|웨이파인딩|led|lcd|전광/.test(k) ||
      /DOOH|디지털|사이니지|스크린|웨이파인딩/i.test(raw)
    ) {
      categories.add("digital");
    }
    if (/전광판|빌보드|billboard|미디어월|미디어타워|미디어파사드/i.test(raw)) {
      intents.add("billboard");
      categories.add("digital");
    }
    if (/와이드\s*칼라|와이드칼라|빌보드|현수막|지주|static|인쇄/.test(k)) {
      categories.add("static");
    }
  }

  // 키워드 묶음 재검사 (단일 토큰이 약할 때)
  if (/psd|스크린도어|지하철|subway/i.test(joined)) intents.add("subway");
  if (/버스\s*(?:래핑|랩핑)|bus\s*wrap|택시\s*래핑/i.test(joined)) {
    intents.add("bus_wrap");
    categories.add("mobile");
  }
  if (/dooh|디지털\s*사이니지|사이니지|웨이파인딩/i.test(joined)) {
    categories.add("digital");
  }
  if (/전광판|빌보드|billboard|미디어월|미디어타워/i.test(joined)) {
    intents.add("billboard");
    categories.add("digital");
  }

  return {
    ...(categories.size > 0 ? { categories: [...categories] } : {}),
    ...(intents.size > 0 ? { mediaIntents: [...intents] } : {}),
  };
}

export function inferIndustryFromText(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "other";
  for (const { re, industry } of INDUSTRY_HINTS) {
    if (re.test(t)) return industry;
  }
  return "other";
}

export function inferTargetsFromText(raw: string | null | undefined): string[] {
  const t = (raw ?? "").trim();
  if (!t) return ["mass"];
  const found: string[] = [];
  for (const { re, target } of TARGET_HINTS) {
    if (re.test(t) && !found.includes(target)) found.push(target);
  }
  return found.length > 0 ? found : ["mass"];
}

/** "월 800만원", "3,000만", "5억" 등 → 원. 실패 시 0 */
export function parseBudgetWon(raw: string | null | undefined): number {
  const t = (raw ?? "").replace(/,/g, "").trim();
  if (!t) return 0;

  const eok = t.match(/(\d+(?:\.\d+)?)\s*억/);
  if (eok) {
    return Math.round(parseFloat(eok[1]!) * 100_000_000);
  }

  const man = t.match(/(\d+(?:\.\d+)?)\s*만/);
  if (man) {
    return Math.round(parseFloat(man[1]!) * 10_000);
  }

  const plain = t.match(/(\d{4,})/);
  if (plain) {
    const n = parseInt(plain[1]!, 10);
    // 만원 단위로 보이는 작은 수 (예: 3000)
    if (n < 100_000) return n * 10_000;
    return n;
  }

  return 0;
}

/** "2026 하반기", "3개월", "월 단위" → durationMonths */
export function parseDurationMonths(raw: string | null | undefined): number {
  const t = (raw ?? "").trim();
  if (!t) return 1;
  const months = t.match(/(\d+)\s*개?월/);
  if (months) return Math.max(1, parseInt(months[1]!, 10));
  if (/하반기|상반기|반기/i.test(t)) return 6;
  if (/분기/i.test(t)) return 3;
  if (/연간|1년|일\s*년/i.test(t)) return 12;
  return 1;
}

export type RfpGroupToMatchingOpts = {
  seed?: number;
  /** 예산 미입력 시 기본값 (원). 0이면 엔진 soft-score(예산 미적용) */
  defaultMonthlyBudgetWon?: number;
};

/**
 * RfpGroup(+ 캠페인 메타) → MatchingInput
 * regionKeywords / mediaTypeKeywords 를 matchMediaCatalog 필터 형식으로 매핑.
 */
export function rfpGroupToMatchingInput(
  group: RfpGroup,
  campaign?: RfpCampaignMeta | null,
  opts?: RfpGroupToMatchingOpts,
): MatchingInput {
  const regions = [
    ...new Set(
      group.regionKeywords
        .map((k) => k.trim())
        .filter((k) => k.length > 0),
    ),
  ];

  const typeMap = mapMediaTypeKeywords(group.mediaTypeKeywords);
  const budgetFromGroup = parseBudgetWon(group.budget);
  const defaultBudget =
    opts?.defaultMonthlyBudgetWon ?? RFP_DEFAULT_MONTHLY_BUDGET_WON;
  const monthlyBudgetWon =
    budgetFromGroup > 0 ? budgetFromGroup : defaultBudget;

  const period = group.period?.trim() || campaign?.period?.trim() || "";
  const industry = inferIndustryFromText(campaign?.industry);
  const targets = inferTargetsFromText(campaign?.target);

  return {
    monthlyBudgetWon,
    regions,
    industry,
    targets,
    durationMonths: parseDurationMonths(period),
    goal: "brand",
    goalTags: ["launch"],
    ...(typeMap.categories ? { categories: typeMap.categories } : {}),
    ...(typeMap.mediaIntents ? { mediaIntents: typeMap.mediaIntents } : {}),
    seed: opts?.seed ?? 0,
  };
}
