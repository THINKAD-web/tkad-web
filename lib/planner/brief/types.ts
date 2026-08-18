/**
 * PR-6a 통합 브리프 — Step 1 상태 모델.
 *
 * 목표: 흩어진 4개 플래닝 입력(자연어/직접/추천/제안)을 단일 브리프로 수렴.
 * 저장 형식은 `CampaignPlanBrief`(#394, `lib/campaign-plan-schema.ts`)와
 * 호환된다 — Step 3 에서 CampaignPlan 으로 그대로 스냅샷한다.
 *
 * 데이터 정확도는 이번 범위 아님. 화면 구조·흐름·상태만 만든다.
 */

import type {
  CampaignPlanBrief,
  CampaignPlanGender,
} from "@/lib/campaign-plan-schema";
import { normalizeSidoCodes, type SidoCode } from "@/lib/planner/brief/regions";

/** 연령대 — CampaignPlanBrief.ageBands 와 동일 (10대 포함) */
export const BRIEF_AGE_BANDS = ["10s", "20s", "30s", "40s", "50s+"] as const;
export type BriefAgeBand = (typeof BRIEF_AGE_BANDS)[number];

export const BRIEF_GENDERS = ["male", "female"] as const;

export const BRIEF_GOALS = ["awareness", "consideration", "conversion"] as const;
export type BriefGoal = (typeof BRIEF_GOALS)[number];

export const BRIEF_INDUSTRIES = [
  "fb",
  "retail",
  "tech",
  "finance",
  "ent",
  "other",
] as const;
export type BriefIndustry = (typeof BRIEF_INDUSTRIES)[number];

/** 예산 입력 의미 — 총액인지 월예산인지 (현재 플래너의 모호함 해소) */
export type BudgetMode = "total" | "monthly";

/** 3단계 흐름 — 기존 6단계 위저드(types.ts)와 별개 */
export type BriefWizardStep = 1 | 2 | 3;

/** O-2 Step 1 진입 모드 */
export type BriefEntryMode = "quick" | "detailed";

export const BRIEF_ENTRY_MODES: readonly BriefEntryMode[] = [
  "quick",
  "detailed",
] as const;

/**
 * Step 1 입력 상태. `CampaignPlanBrief` 로 투영 가능한 상위집합.
 * 예산은 입력 원값(budgetInputWon + budgetMode)을 보존하고,
 * 총액(budgetWon)은 기간과 조합해 파생한다.
 */
export type CampaignBriefInput = {
  /** 사용자가 입력한 예산 원값(원). budgetMode 에 따라 총액 또는 월예산 */
  budgetInputWon: number;
  budgetMode: BudgetMode;
  /** 17개 시도 코드. 빈 배열 = 전국 */
  regionCodes: SidoCode[];
  /** 성별. 빈 배열 = 전 성별 */
  genders: CampaignPlanGender[];
  /** 연령대. 빈 배열 = 전 연령 */
  ageBands: BriefAgeBand[];
  goal: BriefGoal | null;
  industry: BriefIndustry | null;
  /** 집행 시작·종료 (YYYY-MM-DD). 둘 다 있어야 유효 */
  flightStart: string | null;
  flightEnd: string | null;
  /** 자연어 원문 (파싱 출처 추적용) */
  freeText: string;
};

export const EMPTY_BRIEF: CampaignBriefInput = {
  budgetInputWon: 0,
  budgetMode: "total",
  regionCodes: [],
  genders: [],
  ageBands: [],
  goal: null,
  industry: null,
  flightStart: null,
  flightEnd: null,
  freeText: "",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 집행 일수 (포함 기준, 시작·종료 동일 = 1일). 무효 시 null */
export function flightDays(brief: CampaignBriefInput): number | null {
  if (!brief.flightStart || !brief.flightEnd) return null;
  const start = Date.parse(`${brief.flightStart}T00:00:00Z`);
  const end = Date.parse(`${brief.flightEnd}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / MS_PER_DAY) + 1;
}

/**
 * 총 예산(원). 월예산 모드면 집행 개월수를 곱한다.
 * 기간 미입력이면 입력값을 그대로 총액으로 본다(파생 불가).
 */
export function totalBudgetWon(brief: CampaignBriefInput): number {
  if (brief.budgetMode === "total") return Math.max(0, brief.budgetInputWon);
  const days = flightDays(brief);
  if (days == null) return Math.max(0, brief.budgetInputWon);
  const months = Math.max(1, days / 30);
  return Math.round(Math.max(0, brief.budgetInputWon) * months);
}

/**
 * 필수는 예산·기간 2개뿐. 나머지 미입력은 기본값(전국·전 타깃)으로 진행.
 * 반환: 각 필수 항목 충족 여부 + 전체 통과.
 */
export function briefRequiredStatus(brief: CampaignBriefInput): {
  budget: boolean;
  flight: boolean;
  ok: boolean;
} {
  const budget = brief.budgetInputWon > 0;
  const flight = flightDays(brief) != null;
  return { budget, flight, ok: budget && flight };
}

/** O-2 빠른 추천 — 예산만 필수 */
export function briefQuickRequiredStatus(brief: CampaignBriefInput): {
  budget: boolean;
  ok: boolean;
} {
  const budget = brief.budgetInputWon > 0;
  return { budget, ok: budget };
}

export function isBriefEntryMode(v: unknown): v is BriefEntryMode {
  return v === "quick" || v === "detailed";
}

/** 타깃·지역이 기본값(전체)인지 — Step 화면에 "전국·전 타깃 기준" 명시용 */
export function briefUsesDefaults(brief: CampaignBriefInput): {
  allRegions: boolean;
  allGenders: boolean;
  allAges: boolean;
  any: boolean;
} {
  const allRegions = brief.regionCodes.length === 0;
  const allGenders = brief.genders.length === 0;
  const allAges = brief.ageBands.length === 0;
  return {
    allRegions,
    allGenders,
    allAges,
    any: allRegions || allGenders || allAges,
  };
}

function isBriefAgeBand(v: unknown): v is BriefAgeBand {
  return (
    typeof v === "string" &&
    (BRIEF_AGE_BANDS as readonly string[]).includes(v)
  );
}
function isBriefGender(v: unknown): v is CampaignPlanGender {
  return v === "male" || v === "female";
}
function isBriefGoal(v: unknown): v is BriefGoal {
  return (
    typeof v === "string" && (BRIEF_GOALS as readonly string[]).includes(v)
  );
}
function isBriefIndustry(v: unknown): v is BriefIndustry {
  return (
    typeof v === "string" &&
    (BRIEF_INDUSTRIES as readonly string[]).includes(v)
  );
}

/** 저장/복원·URL·파서 출력 → 안전한 CampaignBriefInput (persist merge, hydrate 용) */
export function normalizeBriefInput(raw: unknown): CampaignBriefInput {
  const r = (raw ?? {}) as Partial<Record<keyof CampaignBriefInput, unknown>>;
  const ages: BriefAgeBand[] = Array.isArray(r.ageBands)
    ? [...new Set(r.ageBands.filter(isBriefAgeBand))]
    : [];
  const genders: CampaignPlanGender[] = Array.isArray(r.genders)
    ? [...new Set(r.genders.filter(isBriefGender))]
    : [];
  return {
    budgetInputWon:
      typeof r.budgetInputWon === "number" && r.budgetInputWon >= 0
        ? Math.round(r.budgetInputWon)
        : 0,
    budgetMode: r.budgetMode === "monthly" ? "monthly" : "total",
    regionCodes: normalizeSidoCodes(r.regionCodes),
    genders,
    ageBands: ages,
    goal: isBriefGoal(r.goal) ? r.goal : null,
    industry: isBriefIndustry(r.industry) ? r.industry : null,
    flightStart: typeof r.flightStart === "string" ? r.flightStart : null,
    flightEnd: typeof r.flightEnd === "string" ? r.flightEnd : null,
    freeText: typeof r.freeText === "string" ? r.freeText : "",
  };
}

/**
 * CampaignBriefInput → CampaignPlanBrief (저장 스냅샷 형식).
 * 예산은 총액으로 확정하고, 빈 타깃 배열은 생략(전체 의미)한다.
 */
export function toCampaignPlanBrief(
  brief: CampaignBriefInput,
): CampaignPlanBrief {
  return {
    budgetWon: totalBudgetWon(brief),
    regionCodes: [...brief.regionCodes],
    genders: brief.genders.length > 0 ? [...brief.genders] : undefined,
    ageBands: brief.ageBands.length > 0 ? [...brief.ageBands] : undefined,
    goal: brief.goal ?? undefined,
    industry: brief.industry ?? undefined,
    flightStart: brief.flightStart ?? "",
    flightEnd: brief.flightEnd ?? "",
    freeText: brief.freeText || undefined,
  };
}
