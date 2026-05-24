import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import {
  getChildCategories,
  getMediaCategoryBySlug,
} from "@/lib/media-categories";

/** 월 예산·지역·업종·타겟·기간·목표 기반 매체 매칭 (0–100점, 결정론적) */
export type MatchingGoal =
  | "awareness"
  | "conversion"
  | "event"
  | "brand"
  | "launch"
  | "sales"
  | "local"
  | "consideration";

export type MatchingInput = {
  /** 월 가용 예산 (원) */
  monthlyBudgetWon: number;
  /** 지역 코드 또는 한글 권역명 */
  regions: string[];
  industry: string;
  /** mz | worker | tourist | family | mass | genz | millennial | biz */
  targets: string[];
  durationMonths: number;
  goal: MatchingGoal | string;
  categories?: string[];
  /** 새로고침 시 후보 풀 슬라이드 (랜덤 아님) */
  seed?: number;
};

export type ScoreBreakdown = {
  budget: number;
  region: number;
  industry: number;
  target: number;
  category: number;
  popularity: number;
  total: number;
};

export type MatchReason = { ko: string; en: string };

export type MatchedMedia = {
  media: MediaItem;
  score: number;
  breakdown: ScoreBreakdown;
  reasons: MatchReason[];
  budgetAllocation: number;
  role: "main" | "sub" | "booster";
  reasoning?: string;
  expectedImpact?: string;
  priority: number;
};

type RegionDef = { exact: RegExp; adjacent: RegExp };

const REGION_DEFS: Record<string, RegionDef> = {
  gangnam: {
    exact: /강남|서초|역삼|삼성|청담|논현|테헤란|coex|선릉|신논현/i,
    adjacent: /송파|잠실|양재|대치|도곡|개포/i,
  },
  hongdae: {
    exact: /홍대|마포|합정|상수|연남|신촌|서강|망원|공덕/i,
    adjacent: /용산|이태원|서대문|은평/i,
  },
  seongsu: {
    exact: /성수|뚝섬|건대|왕십리|성동|연무장/i,
    adjacent: /송정|군자|광진|동대문/i,
  },
  myeongdong: {
    exact: /명동|중구|을지로|충무로|동대문|시청|남대문/i,
    adjacent: /종로|광화문|필동|회현/i,
  },
  yeouido: {
    exact: /여의도|영등포|당산|문래|국회|ifc/i,
    adjacent: /마포|용산|강서/i,
  },
  busan: {
    exact: /부산|해운대|센텀|광안|서면|남포/i,
    adjacent: /김해|양산|기장/i,
  },
  jeju: {
    exact: /제주|중문|서귀|애월/i,
    adjacent: /제주/i,
  },
  national: {
    exact: /전국|수도권|national|nationwide/i,
    adjacent: /./,
  },
  seoul: {
    exact: /서울|수도권|강남|홍대|명동|테헤란|여의도|마포|송파|종로|영등포/i,
    adjacent: /경기|인천|판교|분당|일산|송도/i,
  },
  capital: {
    exact: /수도권|경기|인천|판교|분당|일산|송도|하남|수원|성남|고양|부천|안양|용인|서울|강남|테헤란|여의도|홍대|명동|코엑스/i,
    adjacent: /./,
  },
};

const REGION_ALIASES: Record<string, string> = {
  강남: "gangnam",
  홍대: "hongdae",
  성수: "seongsu",
  명동: "myeongdong",
  여의도: "yeouido",
  부산: "busan",
  제주: "jeju",
  전국: "national",
  서울: "seoul",
  seoul_gangnam: "gangnam",
  seoul_hongdae: "hongdae",
  seoul_myeongdong: "myeongdong",
  seoul_yeouido: "yeouido",
  seoul_etc: "seoul",
};

const INDUSTRY_DEFS: Record<
  string,
  { keywords: RegExp; mediaTypes: string[] }
> = {
  beauty: {
    keywords: /미디어폴|스크린도어|dooh|뷰티|코스메|청담|가로수|패션/i,
    mediaTypes: ["digital", "static", "network"],
  },
  fnb: {
    keywords: /버스|쉘터|정류|지역|상권|f&b|식음|카페|레스토랑|fb/i,
    mediaTypes: ["mobile", "static"],
  },
  it: {
    keywords: /지하철|subway|강남|빌보드|테크|it|앱|saas|판교|여의도/i,
    mediaTypes: ["digital", "mobile", "subway"],
  },
  tech: {
    keywords: /지하철|subway|강남|빌보드|테크|it|앱|saas|판교|여의도/i,
    mediaTypes: ["digital", "mobile", "subway"],
  },
  fashion: {
    keywords: /홍대|성수|사이니지|dooh|패션|스트리트|연남|가로수/i,
    mediaTypes: ["digital", "static"],
  },
  retail: {
    keywords: /백화|쇼핑|몰|마트|retail|상권|유동/i,
    mediaTypes: ["digital", "static", "mobile"],
  },
  fmcg: {
    keywords: /역|지하철|상권|유동|마트|편의|fb|카페/i,
    mediaTypes: ["mobile", "subway", "digital"],
  },
  auto: {
    keywords: /고속|휴게|highway|강남대로|자동차|간선|billboard/i,
    mediaTypes: ["static", "billboard"],
  },
  fintech: {
    keywords: /테헤란|판교|여의도|강남|금융|fintech|it|비즈/i,
    mediaTypes: ["digital", "static"],
  },
  entertainment: {
    keywords: /k-pop|홍대|강남|공연|엔터|디지털|지하철|coex/i,
    mediaTypes: ["digital", "mobile"],
  },
  finance: {
    keywords: /여의도|테헤란|판교|금융|은행|증권/i,
    mediaTypes: ["digital", "static"],
  },
  other: { keywords: /./, mediaTypes: [] },
};

const TARGET_DEFS: Record<string, RegExp> = {
  mz: /홍대|성수|강남|건대|대학|연남|이태원|명동|디지털|지하철|coex|역세권/i,
  genz: /홍대|성수|강남|건대|대학|연남|이태원|명동|디지털|지하철|coex|역세권/i,
  millennial: /홍대|강남|성수|테헤란|판교|여의도|코엑스|상권/i,
  worker: /강남|테헤란|여의도|판교|분당|cbd|업무|직장|도심|여의|국회/i,
  biz: /강남|테헤란|여의도|판교|분당|cbd|업무|직장|도심|여의|국회/i,
  tourist: /명동|이태원|홍대|제주|해운대|관광|공항|airport|중문|인사동/i,
  family: /아파트|주거|마트|백화|쇼핑|학원|병원|community|residential/i,
  mass: /역|지하철|터미널|공항|전국|간선|유동|대형/i,
};

function normalizeRegionKey(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  if (REGION_ALIASES[t]) return REGION_ALIASES[t]!;
  if (REGION_ALIASES[lower]) return REGION_ALIASES[lower]!;
  if (REGION_DEFS[lower]) return lower;
  if (lower.startsWith("seoul_")) return REGION_ALIASES[lower] ?? "seoul";
  return lower;
}

function mediaHaystack(m: MediaItem): string {
  return [
    m.name,
    m.nameEn,
    m.location,
    m.locationEn,
    m.city,
    m.district,
    m.region,
    m.regionZone,
    m.subCategory,
    m.nearbyStations,
    m.nearbyLandmarks,
    m.nearbyFacilities,
    m.features,
    m.tags?.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function monthlyPriceWon(m: MediaItem): number {
  const won = catalogPriceFieldToWon(m.price);
  if (won <= 0) return 0;
  const period = (m.pricePeriod ?? "month").toLowerCase();
  if (period === "week") return won * 4;
  if (period === "biweekly") return won * 2;
  if (period === "day") return won * 30;
  return won;
}

function scoreBudget(m: MediaItem, monthlyBudgetWon: number): number {
  if (!(monthlyBudgetWon > 0)) return 22;
  const price = monthlyPriceWon(m);
  if (price <= 0) return 18;
  const ratio = price / monthlyBudgetWon;
  if (ratio > 1) return -1;
  if (ratio >= 0.8) return 20;
  if (ratio >= 0.1) return 30;
  return 15;
}

function scoreRegion(m: MediaItem, regions: string[]): number {
  if (regions.length === 0) return 18;
  const hay = mediaHaystack(m);
  let best = 0;
  for (const raw of regions) {
    const key = normalizeRegionKey(raw);
    const def = REGION_DEFS[key];
    if (!def) {
      if (hay.includes(raw.toLowerCase()) || m.region === raw) best = Math.max(best, 25);
      continue;
    }
    if (def.exact.test(hay) || m.region === key) best = Math.max(best, 25);
    else if (def.adjacent.test(hay)) best = Math.max(best, 15);
  }
  if (regions.some((r) => normalizeRegionKey(r) === "national")) {
    best = Math.max(best, 20);
  }
  return best;
}

function normalizeIndustry(raw: string): string {
  const m: Record<string, string> = {
    beauty: "beauty",
    fnb: "fnb",
    "f&b": "fnb",
    food: "fnb",
    it: "it",
    tech: "tech",
    fashion: "fashion",
    retail: "retail",
    fmcg: "fmcg",
    auto: "auto",
    fintech: "fintech",
    entertainment: "entertainment",
    finance: "finance",
    indfb: "fnb",
    indretail: "retail",
    indtech: "tech",
    indfinance: "finance",
    indent: "entertainment",
    indother: "other",
    other: "other",
  };
  return m[raw.trim().toLowerCase()] ?? raw.trim().toLowerCase();
}

function scoreIndustry(m: MediaItem, industryRaw: string): number {
  const industry = normalizeIndustry(industryRaw);
  const def = INDUSTRY_DEFS[industry] ?? INDUSTRY_DEFS.other!;
  const hay = mediaHaystack(m);
  const type = (m.type ?? "").toLowerCase();
  let pts = 5;
  if (def.keywords.test(hay)) pts = 20;
  else if (def.mediaTypes.some((t) => type.includes(t) || type === t)) pts = 10;
  else if (industry !== "other" && hay.length > 8) pts = 8;
  return pts;
}

function scoreTarget(m: MediaItem, targets: string[]): number {
  if (targets.length === 0) return 10;
  const hay = mediaHaystack(m);
  let best = 5;
  for (const t of targets) {
    const re = TARGET_DEFS[t.trim().toLowerCase()];
    if (re?.test(hay)) best = Math.max(best, 15);
  }
  return best;
}

function scoreCategory(
  m: MediaItem,
  categories: string[] | undefined,
  goal: string,
): number {
  const inputCats = (categories ?? []).map((c) => c.trim()).filter(Boolean);
  const mediaCats = m.mediaCategory ?? [];
  const targetCats = m.targetCategory ?? [];
  let best = inputCats.length === 0 ? 6 : 0;

  for (const c of inputCats) {
    if (mediaCats.includes(c)) best = Math.max(best, 15);
    const children = getChildCategories(c).map((x) => x.slug);
    if (mediaCats.some((mc) => mc === c || children.includes(mc))) {
      best = Math.max(best, 12);
    }
    const node = getMediaCategoryBySlug(c);
    if (node?.parentId && mediaCats.includes(node.parentId)) {
      best = Math.max(best, 10);
    }
  }

  const goalTarget: Record<string, string> = {
    brand: "brand",
    launch: "brand",
    awareness: "brand",
    event: "event",
    local: "small_business",
    conversion: "small_business",
    sales: "small_business",
  };
  const mapped = goalTarget[goal.trim().toLowerCase()];
  if (mapped && targetCats.includes(mapped)) best = Math.max(best, 12);

  for (const t of targetCats) {
    if (inputCats.includes(t)) best = Math.max(best, 14);
  }

  return Math.min(15, best);
}

function scorePopularityTrust(m: MediaItem): number {
  let pts = 0;
  const pop = m.popularityScore ?? 0;
  if (pop > 0) pts += Math.min(5, Math.round(pop / 20));
  if ((m.averageRating ?? 0) >= 4) pts += 5;
  if ((m.executionCount ?? 0) >= 10) pts += 5;
  else if ((m.reviewCount ?? 0) >= 3 && (m.averageRating ?? 0) >= 3.5) pts += 3;
  return Math.min(10, pts);
}

function buildReasons(
  m: MediaItem,
  b: ScoreBreakdown,
  isKo = true,
): MatchReason[] {
  const reasons: MatchReason[] = [];
  if (b.budget >= 20) {
    reasons.push({
      ko: "예산 적합도 ✓",
      en: "Budget fit ✓",
    });
  }
  if (b.region >= 15) {
    reasons.push({
      ko: "지역 매칭 ✓",
      en: "Region match ✓",
    });
  }
  if (b.industry >= 10) {
    reasons.push({
      ko: "업종 적합 ✓",
      en: "Industry fit ✓",
    });
  }
  if (b.target >= 12) {
    reasons.push({
      ko: "타겟 동선 ✓",
      en: "Target audience ✓",
    });
  }
  if (b.category >= 12) {
    reasons.push({
      ko: "카테고리 일치 ✓",
      en: "Category match ✓",
    });
  }
  if (reasons.length === 0) {
    reasons.push({
      ko: isKo ? `${m.name.slice(0, 24)}… 조건 부분 일치` : "Partial condition match",
      en: "Partial match with your criteria",
    });
  }
  return reasons.slice(0, 4);
}

function deterministicHash(id: string, seed: number): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function scoreMedia(m: MediaItem, input: MatchingInput): MatchedMedia | null {
  const budgetPts = scoreBudget(m, input.monthlyBudgetWon);
  if (budgetPts < 0) return null;

  const breakdown: ScoreBreakdown = {
    budget: budgetPts,
    region: scoreRegion(m, input.regions),
    industry: scoreIndustry(m, input.industry),
    target: scoreTarget(m, input.targets),
    category: scoreCategory(m, input.categories, String(input.goal ?? "")),
    popularity: scorePopularityTrust(m),
    total: 0,
  };
  breakdown.total = Math.min(
    100,
    breakdown.budget +
      breakdown.region +
      breakdown.industry +
      breakdown.target +
      breakdown.category +
      breakdown.popularity,
  );

  return {
    media: m,
    score: breakdown.total,
    breakdown,
    reasons: buildReasons(m, breakdown),
    budgetAllocation: 0,
    role: "sub",
    priority: 0,
  };
}

function mediaTypeBucket(m: MediaItem): string {
  const t = (m.type ?? "other").toLowerCase();
  if (/subway|bus|mobile|transport/.test(t)) return "transit";
  if (/digital|network|dooh/.test(t)) return "digital";
  if (/static|billboard/.test(t)) return "static";
  return t || "other";
}

function priceTier(m: MediaItem, pool: MatchedMedia[]): "high" | "mid" | "low" {
  const prices = pool.map((p) => monthlyPriceWon(p.media)).filter((x) => x > 0);
  const p = monthlyPriceWon(m);
  if (prices.length === 0 || p <= 0) return "mid";
  prices.sort((a, b) => a - b);
  const p33 = prices[Math.floor(prices.length * 0.33)] ?? prices[0]!;
  const p66 = prices[Math.floor(prices.length * 0.66)] ?? prices[prices.length - 1]!;
  if (p >= p66) return "high";
  if (p <= p33) return "low";
  return "mid";
}

/** 유형·가격·지역 다양성 + 예산 배분 (main 50% / sub 15%+15% / booster 20%) */
function selectDiversePortfolio(
  candidates: MatchedMedia[],
  limit: number,
  seed: number,
): MatchedMedia[] {
  if (candidates.length === 0) return [];
  const sorted = [...candidates].sort((a, b) => {
    const d = b.score - a.score;
    if (Math.abs(d) > 1e-6) return d;
    return deterministicHash(a.media.id, seed) - deterministicHash(b.media.id, seed);
  });

  const pool = sorted.slice(0, Math.min(20, sorted.length));
  const used = new Set<string>();
  const out: MatchedMedia[] = [];

  const pick = (pred: (c: MatchedMedia) => boolean): MatchedMedia | null => {
    for (const c of pool) {
      if (used.has(c.media.id)) continue;
      if (pred(c)) {
        used.add(c.media.id);
        return c;
      }
    }
    for (const c of pool) {
      if (!used.has(c.media.id)) {
        used.add(c.media.id);
        return c;
      }
    }
    return null;
  };

  const main =
    pick((c) => priceTier(c.media, pool) === "high") ?? pick(() => true);
  if (main) {
    out.push({ ...main, role: "main", budgetAllocation: 0.5, priority: 1 });
  }

  const typesUsed = new Set(out.map((x) => mediaTypeBucket(x.media)));
  for (let i = 0; i < 2 && out.length < limit; i++) {
    const sub = pick((c) => !typesUsed.has(mediaTypeBucket(c.media)));
    if (sub) {
      typesUsed.add(mediaTypeBucket(sub.media));
      out.push({
        ...sub,
        role: "sub",
        budgetAllocation: 0.15,
        priority: out.length + 1,
      });
    }
  }

  if (out.length < limit) {
    const booster =
      pick((c) => priceTier(c.media, pool) === "low") ??
      pick(() => true);
    if (booster) {
      out.push({
        ...booster,
        role: "booster",
        budgetAllocation: 0.2,
        priority: out.length + 1,
      });
    }
  }

  for (const c of pool) {
    if (out.length >= limit) break;
    if (used.has(c.media.id)) continue;
    used.add(c.media.id);
    out.push({
      ...c,
      role: "sub",
      budgetAllocation: 0.1,
      priority: out.length + 1,
    });
  }

  const allocSum = out.reduce((a, x) => a + x.budgetAllocation, 0);
  if (allocSum > 0 && Math.abs(allocSum - 1) > 0.01) {
    for (const x of out) x.budgetAllocation = x.budgetAllocation / allocSum;
  }

  return out.slice(0, limit);
}

export function matchMediaCatalog(
  catalog: readonly MediaItem[],
  input: MatchingInput,
  limit = 10,
): MatchedMedia[] {
  const seed = input.seed ?? 0;
  const categories = input.categories?.filter(Boolean) ?? [];
  let pool = catalog.filter(
    (m) => m?.id && typeof m.id === "string" && m.id.trim().length > 0,
  );

  if (categories.length > 0) {
    const catSet = new Set(categories.map((c) => c.toLowerCase()));
    const filtered = pool.filter((m) =>
      catSet.has((m.type ?? "").toLowerCase()),
    );
    if (filtered.length > 0) pool = filtered;
  }

  const scored: MatchedMedia[] = [];
  for (const m of pool) {
    const s = scoreMedia(m, input);
    if (s) scored.push(s);
  }

  if (scored.length === 0) return [];

  const wantsSpecificRegion =
    input.regions.length > 0 &&
    !input.regions.some((r) => {
      const k = normalizeRegionKey(r);
      return k === "national" || k === "all";
    });
  if (wantsSpecificRegion) {
    const regional = scored.filter((s) => s.breakdown.region >= 15);
    if (regional.length >= Math.min(limit, 3)) {
      pool = regional.map((s) => s.media);
    } else {
      pool = scored.map((s) => s.media);
    }
  } else {
    pool = scored.map((s) => s.media);
  }

  const rescored: MatchedMedia[] = [];
  for (const m of pool) {
    const s = scoreMedia(m, input);
    if (s) rescored.push(s);
  }
  if (rescored.length === 0) return [];

  const offset =
    seed === 0
      ? 0
      : (deterministicHash("window", seed) % Math.max(1, rescored.length - limit));
  const windowed = [...rescored]
    .sort((a, b) => b.score - a.score)
    .slice(offset, offset + Math.max(limit * 2, 20));

  return selectDiversePortfolio(windowed, limit, seed);
}

export function oneLineReason(
  matched: MatchedMedia,
  industry: string,
  targets: string[],
  isKo: boolean,
): string {
  const ind = normalizeIndustry(industry);
  const target = targets[0] ?? "mass";
  const region = matched.media.location?.slice(0, 12) ?? matched.media.region;
  if (isKo) {
    const t =
      target === "mz" || target === "genz"
        ? "MZ"
        : target === "worker" || target === "biz"
          ? "직장인"
          : target === "tourist"
            ? "관광객"
            : "타겟";
    const indKo =
      ind === "beauty"
        ? "뷰티"
        : ind === "fnb"
          ? "F&B"
          : ind === "fashion"
            ? "패션"
            : ind === "it" || ind === "tech"
              ? "IT"
              : "브랜드";
    return `${t} ${indKo} · ${region} 동선에 최적 (${matched.score}점)`;
  }
  return `Strong fit for ${ind} · ${region} (${matched.score}/100)`;
}
