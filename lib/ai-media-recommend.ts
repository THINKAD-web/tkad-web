import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToPriceMan } from "@/lib/media-price-format";
import { matchMediaCatalog } from "@/lib/matching-engine";
import { aiInputToMatching } from "@/lib/recommendation-adapters";

/**
 * AI 매체 추천 (규칙 기반)
 *
 * 1. 후보 풀: `budgetMaxMan` > 0 이면 `catalogPriceFieldToPriceMan(m.price) <= cap` 선필터, 지역은 `regionMatchesMedia`.
 * 2. 점수: `budgetFit*0.4 + targetMatch*0.3 + region*0.2 + visibility*0.1` (각 0–100 근사).
 * 3. 타겟 매칭: `targetAge` 문자열 파싱 후 연령 밴드 겹침 + 상권·업종·캠페인 목표 가중.
 * 4. `score >= MIN_SCORE` 우선, 부족 시 상위 랭킹으로 최소 MIN_RESULTS(5)건 보장, 상위 30건.
 * 5. 후보 풀이 비었거나 5개 미만이면 `paddingCatalog`(또는 동일 카탈로그)에서 보강.
 */
export type CampaignGoal =
  | "awareness"
  | "consideration"
  | "launch"
  | "conversion";

export type TargetAudience = "genz" | "millennial" | "family" | "biz" | "mass";

export type Industry =
  | "retail"
  | "fintech"
  | "fmcg"
  | "auto"
  | "entertainment"
  | "beauty"
  | "other";

export type AiRecommendInput = {
  goal: CampaignGoal;
  target: TargetAudience;
  /** 월 예산 상한 (만원). 0 또는 미입력 = 제한 없음 */
  budgetMaxMan: number;
  region: string;
  industry: Industry;
  /** Media type filter. "all" (default) disables filtering. */
  type?: string;
  /** Minimum visibility score (0–100). 0 disables filtering. */
  minVisibility?: number;
  /** Minimum daily foot traffic. 0 disables filtering. */
  minDailyFootTraffic?: number;
  /** 서울 등 선택 시 `mediaHaystack`에 포함되는 키워드로 한 번 더 좁힘 (하나라도 매칭) */
  locationKeywords?: readonly string[] | null;
  /** 희망 집행 기간(주). UI·사유 문구용 — 스코어 가중은 선택적 */
  preferredPeriodWeeks?: number;
  /**
   * 세부 노출 환경(OR). 비어 있으면 무시. haystack(매체명·위치·특성)에 키워드 매칭.
   * 값: subway | bus | roadside | building | airport | retail
   */
  placementHints?: readonly string[] | null;
};

export type MatchReason = { ko: string; en: string };

export type ScoredMedia = {
  item: MediaItem;
  score: number;
  reasons: MatchReason[];
};

/** score = budget*0.4 + target*0.3 + region*0.2 + visibility*0.1 (각 0–100 근사). */
const W_BUDGET = 0.4;
const W_TARGET = 0.3;
const W_REGION = 0.2;
const W_VISIBILITY = 0.1;

/** 완화: 너무 많이 걸러지는 경우 상위 랭킹으로 보강 */
const MIN_SCORE = 8;
const MIN_RESULTS = 5;
const MAX_RECOMMEND_RESULTS = 30;

/** 세부 노출 환경(선택 시 OR) */
export const PLACEMENT_HINT_KEYS = [
  "subway",
  "bus",
  "roadside",
  "building",
  "airport",
  "retail",
] as const;

const PLACEMENT_HINT_PATTERNS: Record<
  (typeof PLACEMENT_HINT_KEYS)[number],
  RegExp
> = {
  subway: /지하철|subway|역세권|metro|underground/i,
  bus: /버스|bus\s|노선|brt/i,
  roadside: /도로|간선|고속|휴게|간판|로드|roadside|highway/i,
  building: /빌딩|건물|아트월|로비|elevator|facade|wall/i,
  airport: /공항|airport|터미널|terminal/i,
  retail: /백화|쇼핑|몰|마트|retail|storefront/i,
};

function mediaHaystack(m: MediaItem): string {
  return [
    m.location,
    m.locationEn,
    m.city,
    m.district,
    m.nearbyStations,
    m.nearbyLandmarks,
    m.features,
    m.featuresEn,
    m.subCategory,
    m.name,
    m.nameEn,
    m.networkSubtype,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** 서울 선택 시 부산·제주 명시 매체는 제외, 서울·수도권 동선 위주 */
export function regionMatchesMedia(m: MediaItem, code: string): boolean {
  if (code === "all") return true;
  if (m.region === code) return true;
  const h = mediaHaystack(m);
  // Seoul sub-regions (kept as a strict subset of "seoul")
  if (code.startsWith("seoul_")) {
    if (m.region === "busan" || m.region === "jeju") return false;
    if (m.region !== "seoul" && m.region !== "national") return false;
    const patterns: Record<string, RegExp> = {
      seoul_gangnam: /강남|서초|신사|논현|역삼|삼성|대치|청담|테헤란|코엑스|서초/i,
      seoul_hongdae: /홍대|마포|합정|상수|망원|연남|신촌|서강|상암|공덕/i,
      seoul_myeongdong: /명동|중구|을지로|동대문|충무로|시청|남대문/i,
      seoul_yeouido: /여의도|영등포|당산|문래|국회의사당|IFC/i,
      seoul_gangbuk: /종로|광화문|경복궁|서대문|용산|삼청|북촌|혜화/i,
      seoul_etc: /서울|수도권|강북|노원|송파|강동|성동|성수|강서|양천|구로|금천|관악|동작/i,
    };
    const re = patterns[code] ?? /서울|수도권/i;
    return re.test(h);
  }
  if (code === "seoul") {
    if (m.region === "busan" || m.region === "jeju") return false;
    if (m.region === "seoul") return true;
    if (
      m.region === "national" &&
      /서울|수도권|강남|홍대|명동|테헤란|광화문|여의도|마포|송파|종로|영등포|코엑스|판교|분당|강북|노원|동대문/i.test(
        h,
      )
    ) {
      return true;
    }
    return false;
  }
  if (code === "busan") {
    return m.region === "busan" || /부산|해운대|센텀|광안/i.test(h);
  }
  if (code === "jeju") {
    return m.region === "jeju" || /제주/i.test(h);
  }
  /** 폼의「전국」— 단일 코드로는 `seoul` 등만 있던 DB 매체가 빠지지 않도록 전체 허용 */
  if (code === "national") {
    return true;
  }
  if (code === "capital") {
    if (m.region === "busan" || m.region === "jeju") return false;
    if (m.region === "seoul" || m.region === "national") return true;
    return /수도권|경기|인천|판교|분당|일산|송도|김포|하남|수원|성남|고양|부천|안양|용인|과천|의왕|광명|안산|시흥|파주|동탄|화성|광교|수지|분당|테헤란|여의도|강남|홍대|명동|코엑스|서울/i.test(
      h,
    );
  }
  return m.region === code;
}

function targetAudienceBand(t: TargetAudience): { min: number; max: number } {
  switch (t) {
    case "genz":
      return { min: 15, max: 28 };
    case "millennial":
      return { min: 24, max: 42 };
    case "family":
      return { min: 28, max: 55 };
    case "biz":
      return { min: 28, max: 58 };
    default:
      return { min: 18, max: 65 };
  }
}

function parseMediaAgeRanges(raw: string | undefined): { min: number; max: number }[] {
  if (!raw?.trim()) return [];
  const t = raw.replace(/\s/g, "");
  const out: { min: number; max: number }[] = [];
  const rangeRe = /(\d{1,2})\s*[~\-–]\s*(\d{1,2})(?:세)?/g;
  let mm: RegExpExecArray | null;
  while ((mm = rangeRe.exec(t)) !== null) {
    const a = Math.min(Number(mm[1]), Number(mm[2]));
    const b = Math.max(Number(mm[1]), Number(mm[2]));
    if (Number.isFinite(a) && Number.isFinite(b)) out.push({ min: a, max: b });
  }
  /** `20대~40대`, `30대-50대` 등 */
  const decadeSpanRe = /(\d{1,2})대[~\-–](\d{1,2})대/g;
  while ((mm = decadeSpanRe.exec(t)) !== null) {
    const lo = Number(mm[1]);
    const hi = Number(mm[2]);
    if (Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi) {
      out.push({ min: lo, max: hi + 9 });
    }
  }
  const genRe = /(\d{1,2})대/g;
  while ((mm = genRe.exec(t)) !== null) {
    const d = Number(mm[1]);
    if (Number.isFinite(d)) out.push({ min: d, max: d + 9 });
  }
  if (/mz|청년|z세대|10대|20대/i.test(t) && out.length === 0) {
    out.push({ min: 15, max: 34 });
  }
  if (/중장년|30대|40대|50대|직장인|가장/i.test(t) && out.length === 0) {
    out.push({ min: 30, max: 58 });
  }
  return out;
}

/** 타겟 매칭 — 연령 구간 겹침 0–100 */
function subscoreAgeOverlap(mediaText: string | undefined, target: TargetAudience): number {
  const spans = parseMediaAgeRanges(mediaText);
  // If we have no profile for the media, don't give it a neutral "pass".
  // Slightly conservative so explicit target signals win.
  if (spans.length === 0) return 45;
  const band = targetAudienceBand(target);
  let best = 0;
  for (const s of spans) {
    const lo = Math.max(s.min, band.min);
    const hi = Math.min(s.max, band.max);
    if (hi >= lo) {
      const overlap = hi - lo + 1;
      const den = Math.max(band.max - band.min + 1, 1);
      best = Math.max(best, overlap / den);
    }
  }
  return Math.round(28 + best * 72);
}

function youthDistrictHit(target: TargetAudience, m: MediaItem): boolean {
  if (target !== "genz" && target !== "millennial") return false;
  const h = mediaHaystack(m);
  return /홍대|강남|신촌|이태원|성수|건대|대학|연남|망원|을지로|명동|디지털|지하철|subway|코엑스|역세권/i.test(
    h,
  );
}

function matureCorridorHit(target: TargetAudience, m: MediaItem): boolean {
  if (target !== "family" && target !== "biz") return false;
  const h = mediaHaystack(m);
  return /골프|고속|휴게|highway|rest|강남대로|테헤란|여의도|업무|cbd|판교|분당|빌보드|billboard/i.test(
    h,
  );
}

function industryHit(industry: Industry, m: MediaItem): boolean {
  const h = mediaHaystack(m);
  if (industry === "beauty" || industry === "retail") {
    if (/강남|홍대|명동|청담|가로수|성수|패션|뷰티|백화|코스메/i.test(h)) return true;
  }
  if (industry === "auto") {
    if (/고속|휴게|highway|강남대로|자동차|드라이브|간선/i.test(h)) return true;
  }
  if (industry === "fmcg") {
    if (/역|지하철|상권|유동|대형|마트|편의|먹거리|fb|f&b|카페|식음/i.test(h)) return true;
  }
  if (industry === "fintech") {
    if (/테헤란|판교|여의도|강남|코엑스|it|금융|비즈|직장/i.test(h)) return true;
  }
  if (industry === "entertainment") {
    if (/k-pop|팬|홍대|강남|공연|엔터|디지털|지하철/i.test(h)) return true;
  }
  return false;
}

function industryFmcgRetailFootfall(industry: Industry, m: MediaItem): boolean {
  return (
    (industry === "fmcg" || industry === "retail") && m.dailyFootTraffic >= 200000
  );
}

function goalRawPoints(goal: CampaignGoal, m: MediaItem): number {
  if (goal === "awareness") {
    let pts = Math.min(55, Math.round(m.dailyFootTraffic / 35000));
    if (
      m.type === "digital" ||
      m.type === "static" ||
      m.type === "network" ||
      m.type === "billboard"
    ) {
      pts += 18;
    }
    return Math.min(100, pts);
  }
  if (goal === "consideration") {
    if (
      m.type === "mobile" ||
      m.type === "subway" ||
      m.type === "digital"
    ) {
      return 82;
    }
    return 48;
  }
  if (goal === "launch") {
    if (m.type === "digital" || m.dailyFootTraffic >= 300000) return 88;
    return 52;
  }
  if (goal === "conversion") {
    if (m.type === "mobile" || m.type === "subway") return 86;
    if ((m.targetCategory ?? []).includes("small_business")) return 90;
    return 58;
  }
  return 50;
}

/** 타겟 매칭 (연령·동선·업종·캠페인 목표) 0–100 */
function subscoreTargetMatch(m: MediaItem, input: AiRecommendInput): number {
  const age = subscoreAgeOverlap(m.targetAge, input.target);
  let district = 42;
  if (youthDistrictHit(input.target, m)) district = 88;
  else if (matureCorridorHit(input.target, m)) district = 85;

  let ind = 44;
  if (industryHit(input.industry, m)) ind = 86;
  else if (industryFmcgRetailFootfall(input.industry, m)) ind = 72;

  const gl = goalRawPoints(input.goal, m);

  return Math.min(
    100,
    Math.round(age * 0.38 + district * 0.22 + ind * 0.22 + gl * 0.18),
  );
}

/** 지역 적합도 0–100 (필터 통과 매체 기준으로 강도만 차등) */
function subscoreRegion(m: MediaItem, code: string): number {
  if (code === "all") return 76;
  if (code === "national") return 88;
  if (m.region === code) return 100;
  const h = mediaHaystack(m);
  if (code.startsWith("seoul_")) {
    // already filtered by regionMatchesMedia; reward exact corridor hits more.
    return regionMatchesMedia(m, code) ? 100 : 60;
  }
  if (code === "seoul" && m.region === "national") {
    if (/서울|수도권|강남|홍대|명동|테헤란|판교|분당/i.test(h)) return 84;
    return 68;
  }
  if (code === "busan" && m.region !== "busan") return 74;
  if (code === "jeju" && m.region !== "jeju") return 74;
  if (code === "capital") {
    if (m.region === "seoul") return 96;
    if (m.region === "national") return 88;
    const h = mediaHaystack(m);
    if (/수도권|경기|인천|판교|분당|일산|송도|김포|하남|수원|성남|고양|부천|안양|용인|서울|강남|테헤란|여의도|홍대|명동|코엑스/i.test(h))
      return 86;
    return 72;
  }
  return 78;
}

/** 가시성 0–100 */
function subscoreVisibility(m: MediaItem): number {
  const v = m.visibilityScore;
  if (v != null && Number.isFinite(v)) {
    return Math.max(0, Math.min(100, Math.round(v)));
  }
  const f = m.dailyFootTraffic;
  if (f <= 0) return 38;
  return Math.min(100, Math.round(36 + 64 * (1 - Math.exp(-f / 220000))));
}

/** 예산 적합도 0–100 (상한 없음: 중립, 상한 있음: 여유가 클수록 높음) */
function subscoreBudget(
  m: MediaItem,
  budgetCap: number | null,
): number {
  if (budgetCap == null || budgetCap <= 0) return 78;
  const cap = budgetCap;
  const p = catalogPriceFieldToPriceMan(m.price);
  if (p <= 0) return 92;
  const ratio = Math.min(1, p / cap);
  return Math.round(45 + 55 * (1 - ratio));
}

function typeMatchesMedia(m: MediaItem, filter: string | undefined): boolean {
  const f = (filter ?? "all").trim().toLowerCase();
  if (!f || f === "all") return true;
  const t = (m.type ?? "").trim().toLowerCase();

  // Normalize common aliases.
  const norm = (x: string): string => {
    if (x === "billboard") return "static";
    if (x === "subway" || x === "bus" || x === "transport") return "mobile";
    if (x === "network") return "digital";
    return x;
  };

  return norm(t) === norm(f);
}

function dedupeReasons(reasons: MatchReason[]): MatchReason[] {
  const uniq: MatchReason[] = [];
  const seen = new Set<string>();
  for (const r of reasons) {
    if (!seen.has(r.ko)) {
      seen.add(r.ko);
      uniq.push(r);
    }
  }
  return uniq.slice(0, 4);
}

function scoreOne(
  m: MediaItem,
  input: AiRecommendInput,
  budgetCap: number | null,
): ScoredMedia {
  const reasons: MatchReason[] = [];

  const budgetFit = subscoreBudget(m, budgetCap);
  if (budgetCap != null && budgetCap > 0) {
    const priceMan = catalogPriceFieldToPriceMan(m.price);
    reasons.push({
      ko: `월 ${budgetCap.toLocaleString()}만원 이하 조건 충족 (단가 ${priceMan.toLocaleString()}만원/월)`,
      en: `Price ${priceMan.toLocaleString()} ≤ cap ${budgetCap.toLocaleString()} (₩10K units / mo)`,
    });
  } else {
    reasons.push({
      ko: "예산 상한 미설정 — 단가·적합도 신호 위주로 산정",
      en: "No budget cap — ranked mainly on fit and value signals",
    });
  }

  const targetMatching = subscoreTargetMatch(m, input);
  const age = subscoreAgeOverlap(m.targetAge, input.target);
  if (age >= 72) {
    reasons.push({
      ko: "타겟 연령대와 매체 타깃이 잘 맞음",
      en: "Target age aligns with media profile",
    });
  } else if (age >= 58) {
    reasons.push({
      ko: "타겟 연령과 어느 정도 맞음",
      en: "Reasonable overlap with target age",
    });
  }
  if (youthDistrictHit(input.target, m)) {
    reasons.push({
      ko: "20–30대 동선·상권과 잘 맞는 위치",
      en: "Strong fit for Gen Z / millennial corridors",
    });
  }
  if (matureCorridorHit(input.target, m)) {
    reasons.push({
      ko: "가족·직장인·장거리 동선에 맞는 환경",
      en: "Suited to family / commuter / highway visibility",
    });
  }
  if (industryHit(input.industry, m)) {
    reasons.push({
      ko: "선택 업종과 상권·포맷이 잘 맞음",
      en: "Industry–location/format fit",
    });
  }

  const regionFit = subscoreRegion(m, input.region);
  if (input.region === "all" || input.region === "national") {
    reasons.push({
      ko: "전국·복수 지역 노출 옵션",
      en: "Nationwide / multi-region options",
    });
  } else {
    reasons.push({
      ko: "선택 지역과의 적합도",
      en: "Region fit for your selection",
    });
  }

  const visibility = subscoreVisibility(m);
  if (visibility >= 70) {
    reasons.push({
      ko: "가시성·유동 규모 측면에서 유리",
      en: "Strong visibility / footfall signal",
    });
  }

  const score = Math.round(
    budgetFit * W_BUDGET +
      targetMatching * W_TARGET +
      regionFit * W_REGION +
      visibility * W_VISIBILITY,
  );

  return {
    item: m,
    score: Math.max(0, Math.min(100, score)),
    reasons: dedupeReasons(reasons),
  };
}

/** 지역 코드 다중 선택 시 OR 필터 (빈 배열이면 전체 카탈로그) */
export function filterCatalogByRegionCodes(
  catalog: readonly MediaItem[],
  codes: readonly string[],
): MediaItem[] {
  if (codes.length === 0) return [...catalog];
  return catalog.filter((m) =>
    codes.some((c) => regionMatchesMedia(m, c)),
  );
}

type RecommendPoolOpts = {
  skipBudget?: boolean;
  skipPlacement?: boolean;
  skipLocationKeywords?: boolean;
  skipType?: boolean;
  skipMinVisibility?: boolean;
  skipMinFootTraffic?: boolean;
};

function buildRecommendPool(
  valid: readonly MediaItem[],
  input: AiRecommendInput,
  opts: RecommendPoolOpts,
): MediaItem[] {
  const budgetCap = input.budgetMaxMan > 0 ? input.budgetMaxMan : null;
  let pool = [...valid];
  if (budgetCap != null && !opts.skipBudget) {
    pool = pool.filter(
      (m) => catalogPriceFieldToPriceMan(m.price) <= budgetCap,
    );
  }
  if (input.region !== "all") {
    pool = pool.filter((m) => regionMatchesMedia(m, input.region));
  }
  if (input.type && input.type !== "all" && !opts.skipType) {
    pool = pool.filter((m) => typeMatchesMedia(m, input.type));
  }
  const minVis = Math.max(0, Math.round(input.minVisibility ?? 0));
  if (minVis > 0 && !opts.skipMinVisibility) {
    pool = pool.filter((m) => subscoreVisibility(m) >= minVis);
  }
  const minFt = Math.max(0, Math.round(input.minDailyFootTraffic ?? 0));
  if (minFt > 0 && !opts.skipMinFootTraffic) {
    pool = pool.filter((m) => (m.dailyFootTraffic ?? 0) >= minFt);
  }
  const kws = input.locationKeywords?.filter((k) => k.trim().length > 0) ?? [];
  if (kws.length > 0 && !opts.skipLocationKeywords) {
    pool = pool.filter((m) => {
      const h = mediaHaystack(m);
      return kws.some((kw) => h.includes(kw.trim().toLowerCase()));
    });
  }
  const rawHints =
    input.placementHints?.filter((h) => h.trim() && h !== "all") ?? [];
  const placementKeys = rawHints.filter((h): h is (typeof PLACEMENT_HINT_KEYS)[number] =>
    (PLACEMENT_HINT_KEYS as readonly string[]).includes(h),
  );
  if (placementKeys.length > 0 && !opts.skipPlacement) {
    pool = pool.filter((m) => {
      const hay = mediaHaystack(m);
      return placementKeys.some((tag) => PLACEMENT_HINT_PATTERNS[tag].test(hay));
    });
  }
  return pool;
}

export function pickRecommendPool(
  valid: readonly MediaItem[],
  input: AiRecommendInput,
): MediaItem[] {
  const budgetCap = input.budgetMaxMan > 0 ? input.budgetMaxMan : null;
  const steps: RecommendPoolOpts[] = [{}];
  if (budgetCap != null) steps.push({ skipBudget: true });
  steps.push({ skipPlacement: true });
  steps.push({ skipPlacement: true, skipLocationKeywords: true });
  steps.push({ skipPlacement: true, skipLocationKeywords: true, skipType: true });
  if (budgetCap != null) {
    steps.push({ skipBudget: true, skipPlacement: true });
    steps.push({
      skipBudget: true,
      skipPlacement: true,
      skipLocationKeywords: true,
    });
    steps.push({
      skipBudget: true,
      skipPlacement: true,
      skipLocationKeywords: true,
      skipType: true,
    });
  }
  steps.push({
    skipBudget: true,
    skipPlacement: true,
    skipLocationKeywords: true,
    skipType: true,
    skipMinVisibility: true,
    skipMinFootTraffic: true,
  });
  for (const opts of steps) {
    const pool = buildRecommendPool(valid, input, opts);
    if (pool.length > 0) return pool;
  }
  return valid.length > 0 ? [...valid] : [];
}

/** Fisher–Yates shuffle 후 앞에서 n개 — 결정론적 (id+seed 해시 순) */
function deterministicSample<T>(
  items: readonly T[],
  n: number,
  seed: number,
): T[] {
  if (n <= 0 || items.length === 0) return [];
  const copy = [...items].sort((a, b) => {
    const idA =
      typeof a === "object" && a && "id" in a ?
        String((a as { id: string }).id)
      : String(a);
    const idB =
      typeof b === "object" && b && "id" in b ?
        String((b as { id: string }).id)
      : String(b);
    let hA = 2166136261 ^ seed;
    let hB = 2166136261 ^ seed;
    for (const ch of idA) hA = Math.imul(hA ^ ch.charCodeAt(0), 16777619);
    for (const ch of idB) hB = Math.imul(hB ^ ch.charCodeAt(0), 16777619);
    return (hA >>> 0) - (hB >>> 0);
  });
  return copy.slice(0, Math.min(n, copy.length));
}

/** 후보가 MIN_RESULTS 미만이면 같은 카탈로그에서 중복 없이 보강 */
function ensureMinPoolSize(
  pool: MediaItem[],
  catalog: readonly MediaItem[],
  min: number,
): MediaItem[] {
  if (catalog.length === 0) return pool;
  const seen = new Set(pool.map((m) => m.id));
  if (pool.length >= min) return pool;
  const rest = catalog.filter((m) => !seen.has(m.id));
  const need = Math.min(min - pool.length, rest.length);
  if (need <= 0) return pool;
  return [...pool, ...deterministicSample(rest, need, pool.length)];
}

function finalizeScoredList(
  pool: MediaItem[],
  input: AiRecommendInput,
  budgetCap: number | null,
): ScoredMedia[] {
  const scored = pool
    .map((m) => scoreOne(m, input, budgetCap))
    .sort((a, b) => b.score - a.score);
  const passed = scored.filter((s) => s.score >= MIN_SCORE);
  if (passed.length >= MIN_RESULTS) {
    return passed.slice(0, MAX_RECOMMEND_RESULTS);
  }
  if (scored.length === 0) {
    return [];
  }
  const take = Math.min(
    scored.length,
    MAX_RECOMMEND_RESULTS,
    Math.max(MIN_RESULTS, passed.length),
  );
  return scored.slice(0, take);
}

/**
 * @param catalog 추천·점수 산정에 쓰는 후보(지역·검색 등으로 좁힌 목록)
 * @param paddingCatalog 후보가 MIN_RESULTS 미만일 때 같은 조건의 더 넓은 풀에서 ID 중복 없이 보강(미지정 시 catalog)
 */
function recommendMediaCore(
  input: AiRecommendInput,
  catalog: readonly MediaItem[],
  paddingCatalog?: readonly MediaItem[],
): ScoredMedia[] {
  const valid = catalog.filter(
    (m) => m != null && typeof m.id === "string" && m.id.trim().length > 0,
  );
  if (valid.length === 0) return [];

  const padValid = (paddingCatalog ?? catalog).filter(
    (m) => m != null && typeof m.id === "string" && m.id.trim().length > 0,
  );

  const sourceForPad =
    padValid.length > 0 ? padValid : valid;
  const budgetCap = input.budgetMaxMan > 0 ? input.budgetMaxMan : null;
  let pool = pickRecommendPool(valid, input);
  if (pool.length === 0) {
    pool = deterministicSample(
      sourceForPad,
      Math.min(MIN_RESULTS, sourceForPad.length),
      0,
    );
  } else {
    pool = ensureMinPoolSize(pool, sourceForPad, MIN_RESULTS);
  }

  const matchingInput = aiInputToMatching(input, 0);
  const matched = matchMediaCatalog(pool, matchingInput, MAX_RECOMMEND_RESULTS);
  if (matched.length >= MIN_RESULTS) {
    return matched.map((m) => ({
      item: m.media,
      score: m.score,
      reasons: m.reasons,
    }));
  }

  return finalizeScoredList(pool, input, budgetCap);
}

export function recommendMedia(
  input: AiRecommendInput,
  catalog: readonly MediaItem[],
  paddingCatalog?: readonly MediaItem[],
): ScoredMedia[] {
  try {
    return recommendMediaCore(input, catalog, paddingCatalog);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[recommendMedia] failed", err);
    throw err;
  }
}

/** 한반도 근사 바운딩 박스 내 정규화 좌표 (%) */
export function mediaToMapPosition(m: MediaItem): { x: number; y: number } {
  const minLat = 33.1;
  const maxLat = 38.65;
  const minLng = 125.0;
  const maxLng = 132.0;
  const x = ((m.lng - minLng) / (maxLng - minLng)) * 100;
  const y = ((maxLat - m.lat) / (maxLat - minLat)) * 100;
  return {
    x: Math.max(4, Math.min(96, x)),
    y: Math.max(4, Math.min(96, y)),
  };
}
