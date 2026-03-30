import type { MediaItem } from "@/lib/media-data";

/**
 * AI 매체 추천 (규칙 기반)
 *
 * 1. 후보 풀: `budgetMaxMan` > 0 이면 `m.price <= cap` 선필터, 지역은 `regionMatchesMedia`.
 * 2. 점수: `budgetFit*0.4 + targetMatch*0.3 + region*0.2 + visibility*0.1` (각 0–100 근사).
 * 3. 타겟 매칭: `targetAge` 문자열 파싱 후 연령 밴드 겹침 + 상권·업종·캠페인 목표 가중.
 * 4. `score >= 22`만 노출, 상위 15건.
 */
export type CampaignGoal = "awareness" | "consideration" | "launch";

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
};

export type MatchReason = { ko: string; en: string };

export type ScoredMedia = {
  item: MediaItem;
  score: number;
  reasons: MatchReason[];
};

/**
 * score = budget*0.30 + target*0.35 + region*0.20 + visibility*0.10 + value*0.05
 * (각 0–100 근사)
 */
const W_BUDGET = 0.3;
const W_TARGET = 0.35;
const W_REGION = 0.2;
const W_VISIBILITY = 0.1;
const W_VALUE = 0.05;

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
  if (m.region === code) return 100;
  const h = mediaHaystack(m);
  if (code === "seoul" && m.region === "national") {
    if (/서울|수도권|강남|홍대|명동|테헤란|판교|분당/i.test(h)) return 84;
    return 68;
  }
  if (code === "busan" && m.region !== "busan") return 74;
  if (code === "jeju" && m.region !== "jeju") return 74;
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

/** 가성비/효율(유동 대비 단가) 0–100 */
function subscoreValue(m: MediaItem): number {
  const p = Math.max(1, Number.isFinite(m.price) ? m.price : 1);
  const f = Math.max(0, Number.isFinite(m.dailyFootTraffic) ? m.dailyFootTraffic : 0);
  // r = foot-traffic per 1만원. ~ (200k / 3000) = 66.7
  const r = f / p;
  if (r <= 0) return 35;
  // Smooth saturation; tuned so 40~80 range separates meaningfully.
  const s = 100 * (1 - Math.exp(-r / 90));
  return Math.max(0, Math.min(100, Math.round(s)));
}

/** 예산 적합도 0–100 (상한 없음: 중립, 상한 있음: 여유가 클수록 높음) */
function subscoreBudget(
  m: MediaItem,
  budgetCap: number | null,
): number {
  if (budgetCap == null || budgetCap <= 0) return 78;
  const cap = budgetCap;
  const p = Math.max(0, m.price);
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
    reasons.push({
      ko: `월 ${budgetCap.toLocaleString()}만원 이하 조건 충족 (단가 ${m.price.toLocaleString()}만원/월)`,
      en: `Price ${m.price.toLocaleString()} ≤ cap ${budgetCap.toLocaleString()} (₩10K units / mo)`,
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
  if (input.region === "all") {
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

  const value = subscoreValue(m);
  if (value >= 70) {
    reasons.push({
      ko: "유동 대비 단가(가성비) 관점에서 유리",
      en: "Strong value (footfall per price)",
    });
  }

  const score = Math.round(
    budgetFit * W_BUDGET +
      targetMatching * W_TARGET +
      regionFit * W_REGION +
      visibility * W_VISIBILITY +
      value * W_VALUE,
  );

  return {
    item: m,
    score: Math.max(0, Math.min(100, score)),
    reasons: dedupeReasons(reasons),
  };
}

export function recommendMedia(
  input: AiRecommendInput,
  catalog: readonly MediaItem[],
): ScoredMedia[] {
  const valid = catalog.filter(
    (m) => m != null && typeof m.id === "string" && m.id.trim().length > 0,
  );
  if (valid.length === 0) return [];

  const budgetCap = input.budgetMaxMan > 0 ? input.budgetMaxMan : null;
  let pool = valid;
  if (budgetCap != null) {
    pool = pool.filter((m) => m.price <= budgetCap);
  }
  if (input.region !== "all") {
    pool = pool.filter((m) => regionMatchesMedia(m, input.region));
  }
  if (input.type && input.type !== "all") {
    pool = pool.filter((m) => typeMatchesMedia(m, input.type));
  }
  const minVis = Math.max(0, Math.round(input.minVisibility ?? 0));
  if (minVis > 0) {
    pool = pool.filter((m) => subscoreVisibility(m) >= minVis);
  }
  const minFt = Math.max(0, Math.round(input.minDailyFootTraffic ?? 0));
  if (minFt > 0) {
    pool = pool.filter((m) => (m.dailyFootTraffic ?? 0) >= minFt);
  }
  if (pool.length === 0) return [];

  return [...pool]
    .map((m) => scoreOne(m, input, budgetCap))
    .filter((s) => s.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
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
