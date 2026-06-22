import type {
  PlannerCampaignGoal,
  PlannerCategory,
  PlannerMapRegion,
} from "@/lib/planner-logic";

export type { PlannerCampaignGoal, PlannerCategory, PlannerMapRegion };

export const PLANNER_AGE_KEYS = [
  "ageAll",
  "age20s",
  "age30s",
  "age40s",
  "age50plus",
] as const;
export type PlannerAgeKey = (typeof PLANNER_AGE_KEYS)[number];

export const PLANNER_INDUSTRY_KEYS = [
  "indFb",
  "indRetail",
  "indTech",
  "indFinance",
  "indEnt",
  "indOther",
] as const;
export type PlannerIndustryKey = (typeof PLANNER_INDUSTRY_KEYS)[number];

export const PLANNER_DEFAULT_CATEGORIES: PlannerCategory[] = [
  "digital",
  "static",
  "mobile",
];

export const PLANNER_BUDGET_MIN = 500;
export const PLANNER_BUDGET_MAX = 100_000;

/** 1~6 : 입력 단계, 7 : 결과 대시보드 */
export type PlannerWizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const PLANNER_LAST_INPUT_STEP = 6 as const;
export const PLANNER_RESULT_STEP = 7 as const;

export type PlannerPresetId = "premium" | "national" | "value";

export function isPlannerAgeKey(v: unknown): v is PlannerAgeKey {
  return (
    typeof v === "string" &&
    (PLANNER_AGE_KEYS as readonly string[]).includes(v)
  );
}

/** 단일·배열 저장값 → 복수 연령 (빈 배열 = 전 연령) */
export function normalizePlannerAgeKeys(raw: unknown): PlannerAgeKey[] {
  if (Array.isArray(raw)) {
    const out: PlannerAgeKey[] = [];
    for (const v of raw) {
      if (isPlannerAgeKey(v) && v !== "ageAll" && !out.includes(v)) out.push(v);
    }
    return out;
  }
  if (isPlannerAgeKey(raw) && raw !== "ageAll") return [raw];
  return [];
}

export function isPlannerIndustryKey(v: unknown): v is PlannerIndustryKey {
  return (
    typeof v === "string" &&
    (PLANNER_INDUSTRY_KEYS as readonly string[]).includes(v)
  );
}

export function isPlannerCategory(v: unknown): v is PlannerCategory {
  return v === "digital" || v === "static" || v === "mobile";
}

/** 레거시 카테고리 키(`billboard`, `bus`, `subway`) → 현재 키 변환 */
export function normalizePlannerCategories(raw: unknown): PlannerCategory[] {
  const legacy: Record<string, PlannerCategory> = {
    billboard: "static",
    bus: "mobile",
    subway: "mobile",
  };
  if (!Array.isArray(raw)) return [...PLANNER_DEFAULT_CATEGORIES];
  const seen = new Set<PlannerCategory>();
  for (const c of raw) {
    if (typeof c !== "string") continue;
    const mapped = legacy[c] ?? (isPlannerCategory(c) ? c : null);
    if (mapped) seen.add(mapped);
  }
  return seen.size > 0 ? [...seen] : [...PLANNER_DEFAULT_CATEGORIES];
}
