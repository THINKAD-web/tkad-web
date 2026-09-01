import { browseRegionLabel } from "@/lib/media-browse-regions";
import {
  PLANNER_DEFAULT_CATEGORIES,
  type PlannerAgeKey,
  type PlannerCampaignGoal,
  type PlannerCategory,
  type PlannerIndustryKey,
} from "@/lib/planner/types";
import {
  DISTRICT_LABEL_EN,
  DISTRICT_LABEL_KO,
  FALLBACK_SCENARIO_INPUTS,
  GOAL_LABEL_EN,
  GOAL_LABEL_KO,
  GOAL_SCENARIO_BASE,
  INDUSTRY_DISTRICT_HINTS,
  INDUSTRY_LABEL_EN,
  INDUSTRY_LABEL_KO,
} from "@/lib/planner/scenario-generate-rules";
import type {
  PlannerScenario,
  ScenarioInput,
  ScenarioVariant,
} from "@/lib/planner/scenario-types";
import { SCENARIO_VARIANTS } from "@/lib/planner/scenario-types";

const VARIANT_BUDGET_FACTOR: Record<ScenarioVariant, number> = {
  efficiency: 0.65,
  balanced: 1,
  premium: 1.75,
};

const VARIANT_MONTHS_DELTA: Record<ScenarioVariant, number> = {
  efficiency: -1,
  balanced: 0,
  premium: 1,
};

const AGE_CATEGORY_BIAS: Record<
  PlannerAgeKey,
  Partial<Record<PlannerCategory, number>>
> = {
  ageAll: {},
  age20s: { dooh: 1.2, mobile: 1.15 },
  age30s: { dooh: 1.1, static: 1.05 },
  age40s: { static: 1.1, dooh: 1.05 },
  age50plus: { static: 1.15, mobile: 0.95 },
};

function clampBudget(man: number): number {
  return Math.max(500, Math.min(100_000, Math.round(man / 500) * 500));
}

function normalizeMix(
  weights: Partial<Record<PlannerCategory, number>>,
  categories: PlannerCategory[],
): Record<PlannerCategory, number> {
  const out: Record<PlannerCategory, number> = {
    dooh: 0,
    static: 0,
    mobile: 0,
  };
  let sum = 0;
  for (const c of categories) {
    const w = Math.max(0, weights[c] ?? 1);
    out[c] = w;
    sum += w;
  }
  if (sum <= 0) {
    const each = Math.floor(100 / categories.length);
    for (const c of categories) out[c] = each;
    return out;
  }
  for (const c of categories) {
    out[c] = Math.round((out[c] / sum) * 100);
  }
  const drift = 100 - categories.reduce((a, c) => a + out[c], 0);
  if (drift !== 0 && categories[0]) out[categories[0]] += drift;
  return out;
}

function variantCategories(
  base: PlannerCategory[],
  variant: ScenarioVariant,
  ageKeys: PlannerAgeKey[],
): PlannerCategory[] {
  const set = new Set<PlannerCategory>(base);
  if (variant === "efficiency") {
    set.add("mobile");
    set.add("static");
    set.delete("dooh");
  } else if (variant === "premium") {
    set.add("dooh");
    set.add("static");
  }
  if (set.size === 0) return [...PLANNER_DEFAULT_CATEGORIES];
  const cats = [...set].slice(0, 3);
  return cats.length > 0 ? cats : [...PLANNER_DEFAULT_CATEGORIES];
}

function categoryWeights(
  categories: PlannerCategory[],
  variant: ScenarioVariant,
  ageKeys: PlannerAgeKey[],
): Record<PlannerCategory, number> {
  const weights: Partial<Record<PlannerCategory, number>> = {};
  for (const c of categories) weights[c] = 1;

  if (variant === "efficiency") {
    weights.mobile = 1.35;
    weights.static = 1.2;
    weights.dooh = 0.75;
  } else if (variant === "premium") {
    weights.dooh = 1.45;
    weights.static = 1.15;
    weights.mobile = 0.85;
  }

  for (const key of ageKeys) {
    const bias = AGE_CATEGORY_BIAS[key];
    if (!bias) continue;
    for (const c of categories) {
      if (bias[c]) weights[c] = (weights[c] ?? 1) * bias[c]!;
    }
  }

  return normalizeMix(weights, categories);
}

function variantRegions(
  userRegions: string[],
  variant: ScenarioVariant,
  districtHints: string[],
): string[] {
  const base = userRegions.length > 0 ? [...userRegions] : ["seoul"];

  if (variant === "efficiency") {
    return base.slice(0, Math.min(2, base.length));
  }

  if (variant === "premium") {
    const out = new Set(base);
    if (base.includes("seoul") || districtHints.length > 0) {
      out.add("gyeonggi");
    }
    if (base.some((r) => r === "busan" || r === "daegu")) {
      out.add("busan");
    }
    return [...out].slice(0, 6);
  }

  if (base.length >= 3) return base;
  const out = new Set(base);
  if (base.includes("seoul")) out.add("gyeonggi");
  return [...out];
}

function pickDistrictHints(
  industryKey: PlannerIndustryKey,
  regions: string[],
  variant: ScenarioVariant,
): string[] {
  const hints = INDUSTRY_DISTRICT_HINTS[industryKey] ?? ["gangnam"];
  const inSeoul = regions.includes("seoul") || regions.length === 0;
  if (!inSeoul) {
    if (regions.includes("busan")) return ["busan"];
    if (regions.includes("jeju")) return ["jeju"];
    return [];
  }
  const max = variant === "premium" ? 3 : variant === "efficiency" ? 1 : 2;
  return hints.slice(0, max);
}

function focusPeriod(
  months: number,
  variant: ScenarioVariant,
  isKo: boolean,
): { ko: string; en: string } {
  if (months <= 1) {
    return { ko: "1개월 집중 집행", en: "1-month burst" };
  }
  if (variant === "premium") {
    return {
      ko: `전 기간 균등 + ${months}개월 말 런칭 피크`,
      en: `Even flight + launch peak in month ${months}`,
    };
  }
  if (variant === "efficiency") {
    return {
      ko: "초반 4주 집중 후 유지",
      en: "Heavy first 4 weeks, then sustain",
    };
  }
  return {
    ko: `${months}개월 균등 집행`,
    en: `${months}-month even flight`,
  };
}

function regionPhrase(regions: string[], locale: string): string {
  const isKo = locale.startsWith("ko");
  if (regions.length === 0) return isKo ? "전국" : "Nationwide";
  const labels = regions
    .slice(0, 4)
    .map((r) => browseRegionLabel(r, locale, "main"));
  const joined = isKo ? labels.join("·") : labels.join(" · ");
  return regions.length > 4
    ? `${joined}${isKo ? " 외" : " +"}`
    : joined;
}

function districtPhrase(hints: string[], locale: string): string {
  const isKo = locale.startsWith("ko");
  const map = isKo ? DISTRICT_LABEL_KO : DISTRICT_LABEL_EN;
  return hints.map((h) => map[h] ?? h).join(isKo ? "·" : " · ");
}

function categoryPhrase(
  mix: Record<PlannerCategory, number>,
  locale: string,
): string {
  const isKo = locale.startsWith("ko");
  const labels: Record<PlannerCategory, string> = isKo
    ? { dooh: "디지털", static: "고정형", mobile: "이동" }
    : { dooh: "Digital", static: "Static", mobile: "Mobile" };
  return (["dooh", "static", "mobile"] as const)
    .filter((c) => mix[c] > 0)
    .map((c) => `${labels[c]} ${mix[c]}%`)
    .join(isKo ? " · " : " · ");
}

function buildScenario(
  input: ScenarioInput,
  variant: ScenarioVariant,
): PlannerScenario {
  const locale = input.locale ?? "ko";
  const isKo = locale.startsWith("ko");
  const goal: PlannerCampaignGoal = input.goal ?? "brand";
  const base = GOAL_SCENARIO_BASE[goal];
  const regions = input.regions.length > 0 ? input.regions : ["seoul"];
  const districtHints = pickDistrictHints(input.industryKey, regions, variant);
  const scenarioRegions = variantRegions(regions, variant, districtHints);
  const categories = variantCategories(base.categories, variant, input.ageKeys);
  const categoryMixPct = categoryWeights(categories, variant, input.ageKeys);
  const months = Math.max(1, Math.min(12, base.months + VARIANT_MONTHS_DELTA[variant]));
  const budgetMan = clampBudget(base.budgetMan * VARIANT_BUDGET_FACTOR[variant]);
  const focus = focusPeriod(months, variant, isKo);

  const districtPart = districtPhrase(districtHints, locale);
  const regionPart = regionPhrase(scenarioRegions, locale);
  const placePart =
    districtPart && scenarioRegions.includes("seoul")
      ? districtPart
      : regionPart;

  const goalLabel = isKo ? GOAL_LABEL_KO[goal] : GOAL_LABEL_EN[goal];
  const industryLabel = isKo
    ? INDUSTRY_LABEL_KO[input.industryKey]
    : INDUSTRY_LABEL_EN[input.industryKey];

  const variantKo =
    variant === "efficiency"
      ? "효율형"
      : variant === "premium"
        ? "프리미엄형"
        : "균형형";
  const variantEn =
    variant === "efficiency"
      ? "Efficiency"
      : variant === "premium"
        ? "Premium"
        : "Balanced";

  const topCategory = (["dooh", "static", "mobile"] as const)
    .filter((c) => categoryMixPct[c] > 0)
    .sort((a, b) => categoryMixPct[b] - categoryMixPct[a])[0];
  const topCatKo =
    topCategory === "dooh"
      ? "디지털"
      : topCategory === "static"
        ? "고정형"
        : "이동";
  const topCatEn =
    topCategory === "dooh"
      ? "Digital"
      : topCategory === "static"
        ? "Static"
        : "Mobile";

  const labelKo = `${placePart} ${topCatKo} 집중 — ${industryLabel} ${goalLabel}`;
  const labelEn = `${placePart} ${topCatEn} focus — ${industryLabel} ${goalLabel}`;

  const descriptionKo = `${variantKo} · ${categoryPhrase(categoryMixPct, "ko")} · ${budgetMan.toLocaleString("ko-KR")}만원 · ${months}개월 · ${focus.ko}`;
  const descriptionEn = `${variantEn} · ${categoryPhrase(categoryMixPct, "en")} · ₩${(budgetMan * 10_000).toLocaleString("en-US")} · ${months} mo · ${focus.en}`;

  const id = [
    variant,
    goal,
    input.industryKey,
    scenarioRegions.sort().join("+"),
    input.ageKeys.sort().join("+"),
  ].join("|");

  return {
    id,
    variant,
    labelKo,
    labelEn,
    descriptionKo,
    descriptionEn,
    regions: scenarioRegions,
    districtHints,
    categories,
    categoryMixPct,
    budgetMan,
    months,
    focusPeriodKo: focus.ko,
    focusPeriodEn: focus.en,
  };
}

function isInputSparse(input: ScenarioInput): boolean {
  return (
    !input.goal &&
    input.regions.length <= 1 &&
    input.regions[0] === "seoul" &&
    input.industryKey === "indOther" &&
    input.ageKeys.length === 0
  );
}

/**
 * 목표·업종·지역·연령을 받아 2~3안의 맞춤 시나리오를 규칙 기반 조립.
 * AI polish는 label/description 필드만 후속으로 덮어쓸 수 있음.
 */
export function generateScenarios(input: ScenarioInput): PlannerScenario[] {
  if (isInputSparse(input)) {
    return FALLBACK_SCENARIO_INPUTS.map((seed, i) =>
      buildScenario(
        { ...seed, locale: input.locale },
        SCENARIO_VARIANTS[i] ?? "balanced",
      ),
    );
  }

  return SCENARIO_VARIANTS.map((variant) => buildScenario(input, variant));
}

/** 입력 변경 감지용 안정 키 (memo) */
export function scenarioInputKey(input: ScenarioInput): string {
  return [
    input.goal ?? "",
    input.industryKey,
    input.regions.join(","),
    input.ageKeys.join(","),
    input.locale ?? "ko",
  ].join("|");
}
