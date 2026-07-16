import type { MediaItem } from "@/lib/media-data";
import { mediaRegionHaystack } from "@/lib/media-region-haystack";
import type { MatchReason, MatchingInput, ScoreBreakdown } from "@/lib/matching-engine";
import { PLANNER_BUSAN_ZONE_LABELS } from "@/lib/planner/busan-zones";
import { PLANNER_GYEONGGI_ZONE_LABELS } from "@/lib/planner/gyeonggi-zones";
import { PLANNER_INCHEON_ZONE_LABELS } from "@/lib/planner/incheon-zones";
import { PLANNER_SEOUL_ZONE_LABELS } from "@/lib/planner/seoul-zones";
import type { RecommendReasonKey } from "@/lib/planner/recommend";
import { matchesPlannerCategory } from "@/lib/planner-logic";
import type { PlannerCategory } from "@/lib/planner/types";

export type LocalizedRationaleLine = { ko: string; en: string };

/** UI·API 표시용 — 지역 상권·키워드 등 MatchingInput에 없는 맥락 */
export type RecommendRationaleDisplayContext = {
  seoulZones?: readonly string[];
  busanZones?: readonly string[];
  gyeonggiZones?: readonly string[];
  incheonZones?: readonly string[];
  locationKeywords?: readonly string[];
  plannerCategories?: readonly PlannerCategory[];
  /** 만원 단위 월 예산 상한 (recommend 폼) */
  budgetMaxMan?: number;
};

const REGION_CODE_LABELS: Record<string, { ko: string; en: string }> = {
  seoul: { ko: "서울", en: "Seoul" },
  busan: { ko: "부산", en: "Busan" },
  gyeonggi: { ko: "경기", en: "Gyeonggi" },
  incheon: { ko: "인천", en: "Incheon" },
  jeju: { ko: "제주", en: "Jeju" },
  national: { ko: "전국", en: "Nationwide" },
  capital: { ko: "수도권", en: "Capital area" },
  gangnam: { ko: "강남", en: "Gangnam" },
  hongdae: { ko: "홍대", en: "Hongdae" },
  seongsu: { ko: "성수", en: "Seongsu" },
  myeongdong: { ko: "명동", en: "Myeongdong" },
  yeouido: { ko: "여의도", en: "Yeouido" },
  centum: { ko: "센텀", en: "Centum" },
  haeundae: { ko: "해운대", en: "Haeundae" },
  seomyeon: { ko: "서면", en: "Seomyeon" },
  nampo: { ko: "남포", en: "Nampo" },
  downtown: { ko: "부산 시내", en: "Busan downtown" },
};

const INDUSTRY_LABELS: Record<string, { ko: string; en: string }> = {
  beauty: { ko: "뷰티·코스메틱", en: "Beauty" },
  fnb: { ko: "F&B", en: "F&B" },
  it: { ko: "IT·테크", en: "IT / Tech" },
  tech: { ko: "IT·테크", en: "IT / Tech" },
  fashion: { ko: "패션", en: "Fashion" },
  retail: { ko: "리테일", en: "Retail" },
  fmcg: { ko: "FMCG", en: "FMCG" },
  auto: { ko: "자동차", en: "Automotive" },
  fintech: { ko: "핀테크·금융", en: "Fintech" },
  entertainment: { ko: "엔터·문화", en: "Entertainment" },
  finance: { ko: "금융", en: "Finance" },
  other: { ko: "브랜드", en: "Brand" },
};

const TARGET_LABELS: Record<string, { ko: string; en: string }> = {
  mz: { ko: "MZ", en: "Gen Z / young adults" },
  genz: { ko: "MZ", en: "Gen Z" },
  millennial: { ko: "밀레니얼", en: "Millennials" },
  worker: { ko: "직장인", en: "Office workers" },
  biz: { ko: "직장인·B2B", en: "Business audience" },
  tourist: { ko: "관광객", en: "Tourists" },
  family: { ko: "가족·4050", en: "Families" },
  mass: { ko: "대중", en: "Mass audience" },
};

const GOAL_LABELS: Record<string, { ko: string; en: string }> = {
  awareness: { ko: "브랜드 인지", en: "Brand awareness" },
  brand: { ko: "브랜드 인지", en: "Brand awareness" },
  launch: { ko: "런칭·오픈", en: "Launch" },
  conversion: { ko: "전환·구매", en: "Conversion" },
  consideration: { ko: "관심·고려", en: "Consideration" },
  event: { ko: "행사·이벤트", en: "Event" },
  sales: { ko: "매출·판촉", en: "Sales" },
  local: { ko: "로컬·상권", en: "Local" },
};

type RationaleAxis =
  | "region"
  | "category"
  | "budget"
  | "industry"
  | "target"
  | "popularity"
  | "duration";

function isKoLocale(locale: string): boolean {
  return locale.startsWith("ko");
}

function mediaHaystack(m: MediaItem): string {
  return mediaRegionHaystack(m);
}

function mediaLocationSnippet(m: MediaItem, isKo: boolean): string {
  const raw =
    (isKo ? m.regionSub : undefined) ||
    m.district ||
    m.location ||
    m.city ||
    m.region ||
    "";
  const trimmed = raw.trim();
  if (!trimmed) return isKo ? "해당 권역" : "this area";
  return trimmed.length > 28 ? `${trimmed.slice(0, 26)}…` : trimmed;
}

function zoneLabel(code: string, isKo: boolean): string | null {
  const key = code.trim().toLowerCase();
  const incheon =
    PLANNER_INCHEON_ZONE_LABELS[key as keyof typeof PLANNER_INCHEON_ZONE_LABELS];
  if (incheon) return isKo ? incheon.labelKo : incheon.labelEn;
  const fromMap = REGION_CODE_LABELS[key];
  if (fromMap) return isKo ? fromMap.ko : fromMap.en;
  const seoul = PLANNER_SEOUL_ZONE_LABELS[key as keyof typeof PLANNER_SEOUL_ZONE_LABELS];
  if (seoul) return isKo ? seoul.labelKo : seoul.labelEn;
  const busan = PLANNER_BUSAN_ZONE_LABELS[key as keyof typeof PLANNER_BUSAN_ZONE_LABELS];
  if (busan) return isKo ? busan.labelKo : busan.labelEn;
  const gyeonggi =
    PLANNER_GYEONGGI_ZONE_LABELS[key as keyof typeof PLANNER_GYEONGGI_ZONE_LABELS];
  if (gyeonggi) return isKo ? gyeonggi.labelKo : gyeonggi.labelEn;
  if (/[가-힣]/.test(code)) return code.trim();
  return null;
}

export function formatRequestedRegionsText(
  input: MatchingInput,
  display: RecommendRationaleDisplayContext | undefined,
  isKo: boolean,
): string | null {
  const parts: string[] = [];
  const seen = new Set<string>();

  const push = (label: string | null | undefined) => {
    const t = label?.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    parts.push(t);
  };

  for (const z of display?.seoulZones ?? []) push(zoneLabel(z, isKo));
  for (const z of display?.busanZones ?? []) push(zoneLabel(z, isKo));
  for (const z of display?.gyeonggiZones ?? []) push(zoneLabel(z, isKo));
  for (const z of display?.incheonZones ?? []) push(zoneLabel(z, isKo));
  for (const kw of display?.locationKeywords ?? []) push(kw);
  for (const r of input.regions) push(zoneLabel(r, isKo));

  if (parts.length === 0) return null;
  return parts.join(isKo ? " · " : " · ");
}

function mediaCategoryPhrase(m: MediaItem, isKo: boolean): string {
  const hay = mediaHaystack(m);
  const type = (m.type ?? "").toLowerCase();
  if (/택시|taxi/i.test(hay) || /택시|taxi/i.test(m.name)) {
    return isKo ? "택시 래핑" : "taxi wrap";
  }
  if (/버스|bus/i.test(hay)) return isKo ? "버스 광고" : "bus ads";
  if (/지하철|subway|역/i.test(hay)) return isKo ? "지하철·역세권" : "subway / station";
  if (type === "mobile" || m.mediaMainCategory === "mobile") {
    return isKo ? "이동형 매체" : "mobile OOH";
  }
  if (type === "digital" || m.mediaMainCategory === "digital") {
    return isKo ? "디지털 사이니지" : "digital signage";
  }
  if (type === "static" || m.mediaMainCategory === "static") {
    return isKo ? "고정형 옥외" : "static OOH";
  }
  return isKo ? m.name.slice(0, 20) : m.nameEn?.slice(0, 24) || m.name.slice(0, 20);
}

function requestedCategories(
  input: MatchingInput,
  display: RecommendRationaleDisplayContext | undefined,
): PlannerCategory[] {
  const cats = new Set<PlannerCategory>();
  for (const c of display?.plannerCategories ?? []) {
    if (c === "digital" || c === "static" || c === "mobile") cats.add(c);
  }
  for (const c of input.categories ?? []) {
    const lc = c.trim().toLowerCase();
    if (lc === "digital" || lc === "static" || lc === "mobile") cats.add(lc);
  }
  return [...cats];
}

function categoryRequestLabel(cats: PlannerCategory[], isKo: boolean): string | null {
  if (cats.length === 0) return null;
  const labels = cats.map((c) => {
    if (c === "mobile") return isKo ? "이동형" : "mobile";
    if (c === "digital") return isKo ? "디지털" : "digital";
    return isKo ? "고정형" : "static";
  });
  return labels.join(isKo ? "·" : "/");
}

function formatBudgetMan(input: MatchingInput, display?: RecommendRationaleDisplayContext): number | null {
  if (display?.budgetMaxMan && display.budgetMaxMan > 0) {
    return Math.round(display.budgetMaxMan);
  }
  if (input.monthlyBudgetWon > 0) {
    return Math.round(input.monthlyBudgetWon / 10_000);
  }
  return null;
}

/** scoreDuration 과 동일 조건 — breakdown popularity 와 분리 */
function durationFitKind(
  m: MediaItem,
  input: MatchingInput,
): "shortTransit" | "midTransit" | "longFixed" | "midGeneral" | null {
  const days = input.durationDays;
  const months = input.durationMonths;
  if ((!days || days <= 0) && months <= 1) return null;

  const type = (m.type ?? "").toLowerCase();
  const hay = mediaHaystack(m);
  const isTransit =
    type === "mobile" ||
    /지하철|버스|subway|bus|쉘터|brt|역\s|호선|transit/i.test(hay);
  const isFixed =
    type === "static" || type === "digital" || /전광|빌보|billboard|led/i.test(hay);

  if (days != null && days > 0 && days <= 14) {
    return isTransit ? "shortTransit" : null;
  }
  if (days != null && days > 14 && days <= 31) {
    return isTransit ? "midTransit" : isFixed ? "midGeneral" : null;
  }
  if (months >= 3 && isFixed) return "longFixed";
  if (months >= 2) return "midGeneral";
  return null;
}

function axisScore(
  axis: RationaleAxis,
  breakdown: ScoreBreakdown,
  durationFit: ReturnType<typeof durationFitKind>,
): number {
  switch (axis) {
    case "region":
      return breakdown.region;
    case "category":
      return breakdown.category;
    case "budget":
      return breakdown.budget;
    case "industry":
      return breakdown.industry;
    case "target":
      return breakdown.target;
    case "popularity":
      return breakdown.popularity;
    case "duration":
      return durationFit ? 18 : 0;
    default:
      return 0;
  }
}

function axisMeetsThreshold(axis: RationaleAxis, breakdown: ScoreBreakdown): boolean {
  switch (axis) {
    case "budget":
      return breakdown.budget >= 20;
    case "region":
      return breakdown.region >= 15;
    case "industry":
      return breakdown.industry >= 10;
    case "target":
      return breakdown.target >= 12;
    case "category":
      return breakdown.category >= 12;
    case "popularity":
      return breakdown.popularity >= 5;
    case "duration":
      return true;
    default:
      return false;
  }
}

function lineForRegion(
  input: MatchingInput,
  media: MediaItem,
  breakdown: ScoreBreakdown,
  display: RecommendRationaleDisplayContext | undefined,
  isKo: boolean,
): LocalizedRationaleLine | null {
  if (breakdown.region < 15) return null;
  const requested = formatRequestedRegionsText(input, display, isKo);
  const snippet = mediaLocationSnippet(media, isKo);
  if (requested) {
    return isKo
      ? {
          ko: `${requested} 지역 요청과 일치 (${snippet} 소재)`,
          en: `Matches your ${requested} area request (${snippet})`,
        }
      : {
          ko: `${requested} 지역 요청과 일치 (${snippet} 소재)`,
          en: `Matches your ${requested} area request (${snippet})`,
        };
  }
  return isKo
    ? {
        ko: `희망 권역과 노출 위치가 맞습니다 (${snippet})`,
        en: `Exposure location fits your region criteria (${snippet})`,
      }
    : {
        ko: `희망 권역과 노출 위치가 맞습니다 (${snippet})`,
        en: `Exposure location fits your region criteria (${snippet})`,
      };
}

function lineForCategory(
  input: MatchingInput,
  media: MediaItem,
  breakdown: ScoreBreakdown,
  display: RecommendRationaleDisplayContext | undefined,
  isKo: boolean,
): LocalizedRationaleLine | null {
  const cats = requestedCategories(input, display);
  const phrase = mediaCategoryPhrase(media, isKo);
  if (cats.length > 0) {
    const req = categoryRequestLabel(cats, isKo)!;
    const matches = cats.some((c) => matchesPlannerCategory(media, c));
    if (matches || breakdown.category >= 12) {
      return isKo
        ? {
            ko: `${req} 매체 요청 반영 (${phrase})`,
            en: `Reflects your ${req} media request (${phrase})`,
          }
        : {
            ko: `${req} 매체 요청 반영 (${phrase})`,
            en: `Reflects your ${req} media request (${phrase})`,
          };
    }
  }
  if (breakdown.category >= 12) {
    const goal = GOAL_LABELS[String(input.goal)] ?? GOAL_LABELS.brand!;
    return isKo
      ? {
          ko: `${isKo ? goal.ko : goal.en} 목표에 맞는 매체 유형 (${phrase})`,
          en: `Media type fits your ${goal.en} goal (${phrase})`,
        }
      : {
          ko: `${goal.ko} 목표에 맞는 매체 유형 (${phrase})`,
          en: `Media type fits your ${goal.en} goal (${phrase})`,
        };
  }
  return null;
}

function lineForBudget(
  input: MatchingInput,
  breakdown: ScoreBreakdown,
  display: RecommendRationaleDisplayContext | undefined,
  isKo: boolean,
): LocalizedRationaleLine | null {
  if (breakdown.budget < 20) return null;
  const man = formatBudgetMan(input, display);
  if (man != null && man > 0) {
    return {
      ko: `월 예산 ${man.toLocaleString("ko-KR")}만원 대비 단가 적합`,
      en: `Fits within your ~₩${(man * 10_000).toLocaleString()}/mo budget`,
    };
  }
  return isKo
    ? { ko: "제시 예산 범위 내 집행 단가", en: "Unit cost fits your stated budget" }
    : { ko: "제시 예산 범위 내 집행 단가", en: "Unit cost fits your stated budget" };
}

function lineForIndustry(
  input: MatchingInput,
  breakdown: ScoreBreakdown,
  isKo: boolean,
): LocalizedRationaleLine | null {
  if (breakdown.industry < 10) return null;
  const key = input.industry.trim().toLowerCase();
  const label = INDUSTRY_LABELS[key] ?? INDUSTRY_LABELS.other!;
  return isKo
    ? { ko: `${label.ko} 업종 캠페인에 적합한 노출 환경`, en: `Suitable environment for ${label.en} campaigns` }
    : { ko: `${label.ko} 업종 캠페인에 적합한 노출 환경`, en: `Suitable environment for ${label.en} campaigns` };
}

function lineForTarget(
  input: MatchingInput,
  breakdown: ScoreBreakdown,
  isKo: boolean,
): LocalizedRationaleLine | null {
  if (breakdown.target < 12) return null;
  const t = input.targets[0] ?? "mass";
  const label = TARGET_LABELS[t.trim().toLowerCase()] ?? TARGET_LABELS.mass!;
  return isKo
    ? { ko: `${label.ko} 타깃 동선·상권과 맞는 노출`, en: `Reach aligned with ${label.en} audience routes` }
    : { ko: `${label.ko} 타깃 동선·상권과 맞는 노출`, en: `Reach aligned with ${label.en} audience routes` };
}

function lineForPopularity(
  breakdown: ScoreBreakdown,
  isKo: boolean,
): LocalizedRationaleLine | null {
  if (breakdown.popularity < 5) return null;
  return isKo
    ? { ko: "노출량·인지도가 높은 매체", en: "Strong visibility and proven reach" }
    : { ko: "노출량·인지도가 높은 매체", en: "Strong visibility and proven reach" };
}

function lineForDuration(
  m: MediaItem,
  input: MatchingInput,
  fit: NonNullable<ReturnType<typeof durationFitKind>>,
  isKo: boolean,
): LocalizedRationaleLine {
  const days = input.durationDays;
  const months = input.durationMonths;
  const phrase = mediaCategoryPhrase(m, isKo);

  if (fit === "shortTransit" && days) {
    return isKo
      ? {
          ko: `${days}일 단기 집행에 적합한 교통·이동형 매체 (${phrase})`,
          en: `Good for a ${days}-day short flight on transit/mobile (${phrase})`,
        }
      : {
          ko: `${days}일 단기 집행에 적합한 교통·이동형 매체 (${phrase})`,
          en: `Good for a ${days}-day short flight on transit/mobile (${phrase})`,
        };
  }
  if (fit === "midTransit" && days) {
    return isKo
      ? { ko: `${days}일 집행 기간에 맞는 교통 매체 (${phrase})`, en: `Suits a ${days}-day campaign on transit media (${phrase})` }
      : { ko: `${days}일 집행 기간에 맞는 교통 매체 (${phrase})`, en: `Suits a ${days}-day campaign on transit media (${phrase})` };
  }
  if (fit === "longFixed" && months >= 3) {
    return isKo
      ? { ko: `${months}개월 장기 집행에 적합한 고정형 매체`, en: `Well suited for a ${months}-month fixed OOH run` }
      : { ko: `${months}개월 장기 집행에 적합한 고정형 매체`, en: `Well suited for a ${months}-month fixed OOH run` };
  }
  return isKo
    ? { ko: `집행 기간(${months}개월)에 맞는 노출 주기`, en: `Exposure cadence fits a ${months}-month schedule` }
    : { ko: `집행 기간(${months}개월)에 맞는 노출 주기`, en: `Exposure cadence fits a ${months}-month schedule` };
}

function fallbackLine(media: MediaItem, isKo: boolean): LocalizedRationaleLine {
  const name = isKo ? media.name : media.nameEn || media.name;
  const short = name.length > 24 ? `${name.slice(0, 22)}…` : name;
  return isKo
    ? { ko: `${short} — 입력 조건과 부분 일치`, en: `${short} — partial match with your brief` }
    : { ko: `${short} — 입력 조건과 부분 일치`, en: `${short} — partial match with your brief` };
}

/**
 * 규칙 기반 추천 이유 — breakdown 상위 축 + 문의 조건 + 매체 속성.
 * 사용자향 문장만 반환 (점수 미포함).
 */
export function formatRecommendRationale(
  input: MatchingInput,
  media: MediaItem,
  breakdown: ScoreBreakdown,
  locale: string,
  display?: RecommendRationaleDisplayContext,
): LocalizedRationaleLine[] {
  const isKo = isKoLocale(locale);
  const durationFit = durationFitKind(media, input);

  const builders: Record<RationaleAxis, () => LocalizedRationaleLine | null> = {
    region: () => lineForRegion(input, media, breakdown, display, isKo),
    category: () => lineForCategory(input, media, breakdown, display, isKo),
    budget: () => lineForBudget(input, breakdown, display, isKo),
    industry: () => lineForIndustry(input, breakdown, isKo),
    target: () => lineForTarget(input, breakdown, isKo),
    popularity: () => lineForPopularity(breakdown, isKo),
    duration: () =>
      durationFit ? lineForDuration(media, input, durationFit, isKo) : null,
  };

  const rankedAxes = (
    [
      "region",
      "category",
      "duration",
      "budget",
      "industry",
      "target",
      "popularity",
    ] as const
  )
    .map((axis) => ({
      axis,
      score: axisScore(axis, breakdown, durationFit),
    }))
    .filter(({ axis, score }) => {
      if (axis === "duration") return durationFit != null && score > 0;
      return score > 0 && axisMeetsThreshold(axis, breakdown);
    })
    .sort((a, b) => b.score - a.score);

  const lines: LocalizedRationaleLine[] = [];
  const used = new Set<RationaleAxis>();

  for (const { axis } of rankedAxes) {
    if (lines.length >= 3) break;
    if (used.has(axis)) continue;
    const line = builders[axis]();
    if (!line) continue;
    used.add(axis);
    lines.push(line);
  }

  if (lines.length === 0) {
    lines.push(fallbackLine(media, isKo));
  }

  return lines;
}

export function rationaleLinesForLocale(
  lines: readonly LocalizedRationaleLine[],
  locale: string,
): string[] {
  const isKo = isKoLocale(locale);
  return lines.map((l) => (isKo ? l.ko : l.en));
}

export function rationaleSummaryLine(
  lines: readonly LocalizedRationaleLine[],
  locale: string,
): string {
  return rationaleLinesForLocale(lines, locale)[0] ?? "";
}

export function rationaleToMatchReasons(
  input: MatchingInput,
  media: MediaItem,
  breakdown: ScoreBreakdown,
  locale: string,
  display?: RecommendRationaleDisplayContext,
): MatchReason[] {
  return formatRecommendRationale(input, media, breakdown, locale, display).map(
    (l) => ({ ko: l.ko, en: l.en }),
  );
}

/** 플래너 칩용 — breakdown 임계 단일 SSOT */
export function rationaleKeysFromBreakdown(
  breakdown: Pick<
    ScoreBreakdown,
    "budget" | "region" | "industry" | "target" | "category" | "popularity"
  >,
): RecommendReasonKey[] {
  const keys: RecommendReasonKey[] = [];
  if (breakdown.budget >= 20) keys.push("budgetEfficient");
  if (breakdown.region >= 15) keys.push("matchRegion");
  if (breakdown.industry >= 10) keys.push("industryFit");
  if (breakdown.target >= 12) keys.push("ageMatch");
  if (breakdown.category >= 12) keys.push("goalFit");
  if (breakdown.popularity >= 5) keys.push("highVisibility");
  return keys.length > 0 ? keys.slice(0, 3) : ["goalFit"];
}

export function displayContextFromAiInput(
  input: import("@/lib/ai-media-recommend").AiRecommendInput,
): RecommendRationaleDisplayContext {
  return {
    seoulZones: input.seoulZones ?? undefined,
    busanZones: input.busanZones ?? undefined,
    gyeonggiZones: input.gyeonggiZones ?? undefined,
    incheonZones: input.incheonZones ?? undefined,
    locationKeywords: input.locationKeywords ?? undefined,
    plannerCategories: input.plannerCategories ?? undefined,
    budgetMaxMan: input.budgetMaxMan > 0 ? input.budgetMaxMan : undefined,
  };
}

export function displayContextFromPlannerContext(
  ctx: import("@/lib/planner/recommendation-context").RecommendationContext,
): RecommendRationaleDisplayContext {
  return {
    seoulZones: ctx.seoulZones,
    busanZones: ctx.busanZones,
    gyeonggiZones: ctx.gyeonggiZones,
    incheonZones: ctx.incheonZones,
    plannerCategories: ctx.categories,
    budgetMaxMan: ctx.budgetMan > 0 ? ctx.budgetMan : undefined,
  };
}
