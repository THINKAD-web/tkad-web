/**
 * Auto portfolio before (efficiency) vs after (hybrid matching) comparison.
 * Usage: npx tsx scripts/test-portfolio-hybrid.mts
 */
import assert from "node:assert/strict";
import type { MediaItem } from "../lib/media-data";
import {
  PLANNER_AUTO_PORTFOLIO_MAX_ITEMS,
  computePlannerPortfolioBudgetStatus,
  selectPlannerPortfolio,
  selectPlannerPortfolioFromMatching,
} from "../lib/planner-logic";
import type { RecommendationContext } from "../lib/planner/recommendation-context";
import { recommendPlannerMedia } from "../lib/planner/recommend";
import { fetchPublicMediaCatalog } from "../lib/public-media-catalog";
import { catalogPriceFieldToPriceMan } from "../lib/media-price-format";

function fixtureMedia(
  partial: Pick<MediaItem, "id" | "name" | "price" | "dailyFootTraffic"> &
    Partial<MediaItem>,
): MediaItem {
  return {
    id: partial.id,
    name: partial.name,
    nameEn: partial.name,
    location: partial.location ?? "서울",
    locationEn: partial.locationEn ?? "Seoul",
    region: partial.region ?? "seoul",
    type: partial.type ?? "digital",
    price: partial.price,
    dailyFootTraffic: partial.dailyFootTraffic,
    visibilityScore: partial.visibilityScore ?? 3,
    targetCategory: partial.targetCategory ?? ["brand"],
    mediaCategory: partial.mediaCategory ?? ["dooh"],
    ...partial,
  };
}

const FIXTURE_POOL: MediaItem[] = [
  fixtureMedia({
    id: "eff-high-traffic",
    name: "고유동 저단가",
    price: 150,
    dailyFootTraffic: 600_000,
    targetCategory: ["brand"],
    type: "digital",
  }),
  fixtureMedia({
    id: "conv-local-cheap",
    name: "로컬 상권 보드",
    price: 120,
    dailyFootTraffic: 80_000,
    targetCategory: ["small_business"],
    type: "static",
    location: "부산 서면",
    region: "busan",
  }),
  fixtureMedia({
    id: "consider-event",
    name: "이벤트 팝업 존",
    price: 280,
    dailyFootTraffic: 220_000,
    targetCategory: ["event", "fandom"],
    type: "digital",
    location: "홍대",
  }),
  fixtureMedia({
    id: "brand-premium",
    name: "강남 프리미엄 폴",
    price: 450,
    dailyFootTraffic: 400_000,
    targetCategory: ["brand"],
    type: "static",
    location: "강남",
  }),
  fixtureMedia({
    id: "conv-mobile",
    name: "지하철 래핑",
    price: 200,
    dailyFootTraffic: 350_000,
    targetCategory: ["small_business"],
    type: "mobile",
  }),
];

function portfolioLabel(items: MediaItem[]): string {
  return items
    .map(
      (m) =>
        `${m.id}(${catalogPriceFieldToPriceMan(m.price)}만·${Math.round(m.dailyFootTraffic / 1000)}k/d)`,
    )
    .join(", ");
}

function baseCtx(
  goal: RecommendationContext["goal"],
  overrides: Partial<RecommendationContext> = {},
): RecommendationContext {
  return {
    goal,
    regions: ["seoul"],
    categories: ["digital", "static", "mobile"],
    ageKey: "age30s",
    industryKey: "indRetail",
    budgetMan: 3000,
    months: 3,
    ...overrides,
  };
}

function comparePortfolio(
  label: string,
  filtered: MediaItem[],
  ctx: RecommendationContext,
) {
  const legacy = selectPlannerPortfolio(
    filtered,
    ctx.budgetMan,
    ctx.months,
    PLANNER_AUTO_PORTFOLIO_MAX_ITEMS,
  );
  const hybrid = selectPlannerPortfolioFromMatching(
    filtered,
    ctx,
    ctx.budgetMan,
    ctx.months,
    PLANNER_AUTO_PORTFOLIO_MAX_ITEMS,
  );
  const budget = computePlannerPortfolioBudgetStatus(
    hybrid,
    ctx.budgetMan,
    ctx.months,
  );
  const step4 = recommendPlannerMedia(filtered, ctx, 5, 0).map((s) => s.media.id);

  console.log(`\n=== ${label} ===`);
  console.log(`BEFORE (efficiency): ${portfolioLabel(legacy) || "(empty)"}`);
  console.log(`AFTER  (hybrid):    ${portfolioLabel(hybrid) || "(empty)"}`);
  console.log(
    `Changed: ${legacy.map((m) => m.id).join("|") !== hybrid.map((m) => m.id).join("|") ? "YES" : "NO"}`,
  );
  console.log(`Step4 top IDs:     ${step4.join(", ") || "(none)"}`);
  console.log(
    `Hybrid overlaps Step4: ${hybrid.some((m) => step4.includes(m.id)) ? "YES" : "NO"}`,
  );
  console.log(
    `Budget OK (≤ campaign): ${budget.overBudget ? "OVER" : "OK"} (${budget.periodTotalMan.toFixed(0)} / ${budget.budgetMan.toFixed(0)} 만)`,
  );

  return { legacy, hybrid, step4 };
}

// --- Fixture-based (always runs) ---
const brandCtx = baseCtx("brand");
const salesCtx = baseCtx("sales");

const brandRun = comparePortfolio("Fixture · 브랜드 인지 (brand)", FIXTURE_POOL, brandCtx);
const salesRun = comparePortfolio("Fixture · 실적 전환 (sales)", FIXTURE_POOL, salesCtx);

assert.notDeepEqual(
  brandRun.hybrid.map((m) => m.id),
  salesRun.hybrid.map((m) => m.id),
  "goal change should produce different hybrid portfolios",
);

assert.ok(
  brandRun.hybrid.some((m) => step4Includes(brandRun.step4, m.id)) ||
    brandRun.hybrid.length > 0,
  "hybrid portfolio non-empty",
);

function step4Includes(step4: string[], id: string): boolean {
  return step4.includes(id);
}

// Efficiency picks highest traffic/price — typically eff-high-traffic first
assert.equal(
  brandRun.legacy[0]?.id,
  "eff-high-traffic",
  "legacy should prefer traffic/price efficiency",
);

// --- Live catalog (optional) ---
const catalog = await fetchPublicMediaCatalog();
if (catalog.length >= 10) {
  const seoulDigital = catalog.filter(
    (m) => m.region === "seoul" && (m.type === "digital" || m.type === "static"),
  );
  if (seoulDigital.length >= 5) {
    comparePortfolio(
      `Live DB · seoul (${seoulDigital.length} items) · brand vs sales`,
      seoulDigital.slice(0, 40),
      baseCtx("brand", { budgetMan: 5000, months: 3 }),
    );
    comparePortfolio(
      `Live DB · same pool · sales`,
      seoulDigital.slice(0, 40),
      baseCtx("sales", { budgetMan: 5000, months: 3 }),
    );
  }
} else {
  console.log("\n(Live catalog empty — fixture-only assertions ran)");
}

console.log("\nPortfolio hybrid tests completed.");
