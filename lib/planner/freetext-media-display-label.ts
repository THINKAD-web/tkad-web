import type { PlannerFreetextParseResult } from "@/lib/planner/parse-freetext-brief";
import type { PlannerCategory } from "@/lib/planner/types";
import { parseFreetextMediaIntents } from "@/lib/recommend/freetext-media-intents";

const CATEGORY_LABELS: Record<PlannerCategory, { ko: string; en: string }> = {
  dooh: { ko: "디지털·전광판", en: "Digital signage" },
  static: { ko: "옥외·고정형", en: "Static OOH" },
  mobile: { ko: "이동형·버스", en: "Mobile transit" },
};

/** parseCategories 레거시 키 — 표시용 normalize */
const LEGACY_CATEGORY_LABELS: Record<string, { ko: string; en: string }> = {
  digital: CATEGORY_LABELS.dooh,
};

const CATEGORY_ORDER: PlannerCategory[] = ["dooh", "static", "mobile"];

function normalizeCategoryKey(cat: string): PlannerCategory | null {
  if (cat === "digital") return "dooh";
  if (cat === "dooh" || cat === "static" || cat === "mobile") return cat;
  return null;
}

function hasDoohLikeCategory(cats: readonly string[]): boolean {
  return cats.some((c) => c === "dooh" || c === "digital");
}

/**
 * high-confidence 지하철 의도 — mediaIntents + categories confidence.
 * 스코어링/PlannerCategory 체계는 건드리지 않고 표시 라벨만 분리.
 */
export function isSubwayPrimaryMediaDisplay(
  result: PlannerFreetextParseResult,
): boolean {
  const cats = result.fields.categories.value;
  if (!cats?.length) return false;
  if (result.fields.categories.confidence !== "high") return false;
  if (!parseFreetextMediaIntents(result.raw).includes("subway")) return false;

  const keys = cats.map(String);
  return hasDoohLikeCategory(keys) && keys.includes("mobile");
}

/** 요약 문장·배너용 — "지하철" 메인 라벨 */
export function resolveFreetextMediaSummaryLabel(
  result: PlannerFreetextParseResult,
  isKo: boolean,
): string | null {
  const cats = result.fields.categories.value;
  if (!cats?.length) return null;
  if (isSubwayPrimaryMediaDisplay(result)) {
    return isKo ? "지하철" : "Subway";
  }
  return formatPlannerCategoriesLabel(cats, isKo);
}

/** evidence·상세용 — 지하철이면 역사·차내 보조 설명 포함 */
export function resolveFreetextMediaEvidenceLabel(
  result: PlannerFreetextParseResult,
  isKo: boolean,
): string | null {
  const cats = result.fields.categories.value;
  if (!cats?.length) return null;
  if (isSubwayPrimaryMediaDisplay(result)) {
    return isKo ? "지하철 (역사·차내)" : "Subway (station & in-train)";
  }
  return formatPlannerCategoriesLabel(cats, isKo);
}

export function formatPlannerCategoriesLabel(
  cats: readonly PlannerCategory[] | readonly string[],
  isKo: boolean,
): string {
  const ordered = CATEGORY_ORDER.filter((c) =>
    cats.some((raw) => normalizeCategoryKey(String(raw)) === c),
  );
  const labels = ordered.map((c) =>
    isKo ? CATEGORY_LABELS[c].ko : CATEGORY_LABELS[c].en,
  );
  if (labels.length > 0) return labels.join(isKo ? " · " : ", ");

  return cats
    .map((raw) => {
      const key = String(raw);
      const norm = normalizeCategoryKey(key);
      if (norm) return isKo ? CATEGORY_LABELS[norm].ko : CATEGORY_LABELS[norm].en;
      const legacy = LEGACY_CATEGORY_LABELS[key];
      return legacy ? (isKo ? legacy.ko : legacy.en) : key;
    })
    .join(isKo ? " · " : ", ");
}
