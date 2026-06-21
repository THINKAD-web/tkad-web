/**
 * Smoke-test matching scenarios (deterministic, no random).
 * Usage: npx tsx scripts/test-matching-scenarios.mts
 */
import { fetchPublicMediaCatalog } from "../lib/public-media-catalog";
import { matchMediaCatalog } from "../lib/matching-engine";
import { recommendPlannerMedia } from "../lib/planner/recommend";
import type { PlannerCategory, PlannerIndustryKey } from "../lib/planner/types";

const scenarios = [
  {
    name: "A: 300만/강남/뷰티/MZ",
    input: {
      monthlyBudgetWon: 3_000_000,
      regions: ["gangnam", "강남"],
      industry: "beauty",
      targets: ["mz"],
      durationMonths: 1,
      goal: "awareness",
    },
  },
  {
    name: "B: 5000만/전국/패션/MZ",
    input: {
      monthlyBudgetWon: 50_000_000,
      regions: ["national", "seoul"],
      industry: "fashion",
      targets: ["mz"],
      durationMonths: 3,
      goal: "brand",
    },
  },
  {
    name: "C: 200만/부산/F&B/직장인",
    input: {
      monthlyBudgetWon: 2_000_000,
      regions: ["busan", "부산"],
      industry: "fnb",
      targets: ["worker"],
      durationMonths: 1,
      goal: "conversion",
    },
  },
  {
    name: "D: 800만/홍대/엔터/MZ · 고려",
    input: {
      monthlyBudgetWon: 8_000_000,
      regions: ["hongdae", "홍대"],
      industry: "entertainment",
      targets: ["mz"],
      durationMonths: 2,
      goal: "consideration",
    },
  },
  {
    name: "E: 1000만/강남/뷰티 · 런칭 태그",
    input: {
      monthlyBudgetWon: 10_000_000,
      regions: ["gangnam", "강남"],
      industry: "beauty",
      targets: ["millennial"],
      durationMonths: 1,
      goal: "awareness",
      goalTags: ["launch"],
    },
  },
];

const catalog = await fetchPublicMediaCatalog();
console.log(`Catalog: ${catalog.length} media\n`);

for (const s of scenarios) {
  const a = matchMediaCatalog(catalog, s.input, 5);
  const b = matchMediaCatalog(catalog, s.input, 5);
  const same =
    a.length === b.length &&
    a.every((x, i) => x.media.id === b[i]?.media.id && x.score === b[i]?.score);

  console.log(`=== ${s.name} ===`);
  console.log(`Deterministic: ${same ? "YES" : "NO"}`);
  for (const m of a) {
    console.log(
      `  ${m.score}pt · ${m.role} · ${m.media.name.slice(0, 40)} (${m.media.region})`,
    );
  }
  console.log("");
}

/** Phase 2-a: industryKey should shift rankings (DB catalog when available). */
if (catalog.length > 0) {
  const industryBase = {
    goal: "brand" as const,
    regions: ["gangnam", "강남"],
    categories: [] as PlannerCategory[],
    ageKey: "age20s" as const,
    budgetMan: 300,
    months: 1,
  };

  function topIds(industryKey: PlannerIndustryKey): string[] {
    return recommendPlannerMedia(
      catalog,
      { ...industryBase, industryKey },
      8,
    ).map((s) => s.media.id);
  }

  function overlap(a: string[], b: string[]): number {
    const setB = new Set(b);
    return a.filter((id) => setB.has(id)).length;
  }

  console.log("=== Industry reflect (planner recommendPlannerMedia) ===");
  const fbIds = topIds("indFb");
  const retailIds = topIds("indRetail");
  const techIds = topIds("indTech");
  const otherIds = topIds("indOther");

  console.log(`F&B top:     ${fbIds.join(", ")}`);
  console.log(`Retail top:  ${retailIds.join(", ")}`);
  console.log(`Tech top:    ${techIds.join(", ")}`);
  console.log(`Other top:   ${otherIds.join(", ")}`);
  console.log(
    `Overlap F&B↔Retail: ${overlap(fbIds, retailIds)}/8 · F&B↔Tech: ${overlap(fbIds, techIds)}/8 · F&B↔Other: ${overlap(fbIds, otherIds)}/8`,
  );
  const industryDiffers =
    fbIds.join() !== retailIds.join() || fbIds.join() !== techIds.join();
  console.log(`Industry changes ranking: ${industryDiffers ? "YES" : "NO"}`);
  console.log("");
} else {
  console.log(
    "(Catalog empty — run scripts/test-planner-industry-reflect.mts for fixture checks)\n",
  );
}
