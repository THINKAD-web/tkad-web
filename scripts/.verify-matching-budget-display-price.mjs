#!/usr/bin/env node
/**
 * #4-2 verification: matching budget uses display SSOT (after) vs legacy quantity path (before).
 * Usage: node --import tsx scripts/.verify-matching-budget-display-price.mjs
 * Writes: scripts/.verify-matching-budget-display-price/{report.json,REPORT.md}
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { matchMediaCatalog, scoreMediaForRanking } from "../lib/matching-engine.ts";
import { resolveMonthlyListPriceWon } from "../lib/media-metrics.ts";
import {
  isMobileSingleMedia,
  resolveMonthlyPriceForUnits,
} from "../lib/media-quantity.ts";
import { isNetworkCatalogItem } from "../lib/matching-network-helpers.ts";
import { resolveMediaDisplayPrice } from "../lib/media-price-format.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, ".verify-matching-budget-display-price");
const BASE = process.env.VERIFY_BASE ?? "http://127.0.0.1:3000";

const BUDGETS = [
  { label: "1천만", won: 10_000_000 },
  { label: "3천만", won: 30_000_000 },
  { label: "5천만", won: 50_000_000 },
  { label: "1억", won: 100_000_000 },
];

const EXTREMES = [
  { nameIncludes: "여의도 환승센터", expectDisplayNear: 3_000_000 },
  { nameIncludes: "명동 미디어폴", expectDisplayNear: 700_000 },
];

/** Legacy monthlyPriceWon (#4 era): quantity first, then display for non-network. */
function legacyMonthlyPriceWon(m) {
  const resolved = resolveMonthlyPriceForUnits(m);
  if (resolved > 0) return resolved;
  if (isNetworkCatalogItem(m)) return 0;
  return resolveMonthlyListPriceWon(m);
}

function budgetBandForMedia(m, price, monthlyBudgetWon) {
  if (!(monthlyBudgetWon > 0)) return { pts: 22, band: "no-budget" };
  if (!(price > 0)) {
    return {
      pts: isNetworkCatalogItem(m) ? 12 : 18,
      band: "unknown",
    };
  }
  const ratio = price / monthlyBudgetWon;
  if (ratio > 1) return { pts: -1, band: "over" };
  if (ratio >= 0.8) return { pts: 20, band: "tight" };
  if (ratio >= 0.1) return { pts: 30, band: "sweet" };
  if (isNetworkCatalogItem(m) && ratio > 0) return { pts: 26, band: "network-in" };
  return { pts: 15, band: "cheap" };
}

/** Force engine (display SSOT) to score as if price were legacy monthly. */
function cloneForLegacyScoring(m) {
  const legacy = legacyMonthlyPriceWon(m);
  if (!(legacy > 0)) {
    return {
      ...m,
      price: 0,
      pricePeriod: "month",
      priceOptions: [],
    };
  }
  return {
    ...m,
    price: legacy,
    pricePeriod: "month",
    priceOptions: [],
  };
}

function classify(m) {
  if (isNetworkCatalogItem(m)) return "network";
  if (isMobileSingleMedia(m)) return "mobile";
  return "fixed";
}

function baseInput(budgetWon, seed = 42) {
  return {
    monthlyBudgetWon: budgetWon,
    regions: ["seoul"],
    industry: "beauty",
    targets: ["mz"],
    durationMonths: 1,
    goal: "awareness",
    seed,
  };
}

async function loadCatalog() {
  const res = await fetch(`${BASE}/api/public/media-catalog`);
  if (!res.ok) throw new Error(`catalog HTTP ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("empty catalog");
  }
  return items;
}

function gitUnchanged(relPath) {
  try {
    const out = execSync(`git diff --name-only HEAD -- ${relPath}`, {
      encoding: "utf8",
    }).trim();
    return out.length === 0;
  } catch {
    return false;
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const catalog = await loadCatalog();

  const quoteLineUntouched = gitUnchanged("lib/media-quantity.ts");
  const quoteCalcUntouched = gitUnchanged("lib/quote-calculator.ts");

  // Spot-check resolveMonthlyPriceForUnits still callable & stable vs display SSOT formula identity for fixed m.price
  const quoteLineSpot = [];
  for (const m of catalog.slice(0, 50)) {
    const a = resolveMonthlyPriceForUnits(m);
    const b = resolveMonthlyPriceForUnits(m, 1);
    quoteLineSpot.push({
      id: m.id,
      defaultOk: Number.isFinite(a),
      units1Ok: Number.isFinite(b),
    });
  }

  const priceRows = [];
  let mismatch = 0;
  let matchEqual = 0;
  let networkCount = 0;
  let changedBandAnyBudget = 0;
  const changedCases = [];

  for (const m of catalog) {
    const kind = classify(m);
    if (kind === "network") {
      networkCount++;
    }
    const legacy = legacyMonthlyPriceWon(m);
    const display = resolveMonthlyListPriceWon(m);
    const equal = Math.abs(legacy - display) < 1;
    if (!equal && kind !== "network") {
      // count non-network price path diffs (same as diagnosis mismatch when both >0)
      if (legacy > 0 && display > 0) mismatch++;
    }
    if (equal) matchEqual++;

    const bandChanges = {};
    let anyBandChange = false;
    for (const b of BUDGETS) {
      const before = budgetBandForMedia(m, legacy, b.won);
      const after = budgetBandForMedia(m, display, b.won);
      bandChanges[b.label] = {
        before: before.band,
        after: after.band,
        beforePts: before.pts,
        afterPts: after.pts,
        changed: before.band !== after.band || before.pts !== after.pts,
      };
      if (bandChanges[b.label].changed) anyBandChange = true;
    }

    if (anyBandChange) {
      changedBandAnyBudget++;
      changedCases.push({
        id: m.id,
        name: m.name,
        kind,
        legacy,
        display,
        ratio:
          legacy > 0 && display > 0
            ? Math.max(legacy, display) / Math.min(legacy, display)
            : null,
        bandChanges,
      });
    }

    if (!equal && kind !== "network" && legacy > 0 && display > 0) {
      priceRows.push({
        id: m.id,
        name: m.name,
        kind,
        legacy,
        display,
        ratio: Math.max(legacy, display) / Math.min(legacy, display),
      });
    }
  }

  priceRows.sort((a, b) => b.ratio - a.ratio);
  changedCases.sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));

  // Equal-price media: per-media score must be identical (portfolio presence may still shift)
  const equalIds = new Set();
  for (const m of catalog) {
    if (isNetworkCatalogItem(m)) continue;
    const legacy = legacyMonthlyPriceWon(m);
    const display = resolveMonthlyListPriceWon(m);
    if (Math.abs(legacy - display) < 1 && legacy > 0) equalIds.add(m.id);
  }

  const equalRegression = [];
  const input10m = baseInput(10_000_000);
  for (const m of catalog) {
    if (!equalIds.has(m.id)) continue;
    const after = scoreMediaForRanking(m, input10m);
    const before = scoreMediaForRanking(cloneForLegacyScoring(m), input10m);
    if (
      after.breakdown.budget !== before.breakdown.budget ||
      Math.abs(after.score - before.score) > 1e-6
    ) {
      equalRegression.push({
        id: m.id,
        name: m.name,
        issue: "score",
        beforeBudget: before.breakdown.budget,
        afterBudget: after.breakdown.budget,
        beforeScore: before.score,
        afterScore: after.score,
      });
    }
  }

  // Portfolio presence among equal media can shift when mismatch peers enter/leave — note only
  const afterAll = matchMediaCatalog(catalog, input10m, 200);
  const beforeAll = matchMediaCatalog(
    catalog.map(cloneForLegacyScoring),
    input10m,
    200,
  );
  const afterById = new Map(afterAll.map((x) => [x.media.id, x]));
  const beforeById = new Map(beforeAll.map((x) => [x.media.id, x]));
  let equalPortfolioPresenceShift = 0;
  for (const id of equalIds) {
    const a = afterById.has(id);
    const b = beforeById.has(id);
    if (a !== b) equalPortfolioPresenceShift++;
  }

  const top20ByBudget = {};
  for (const b of BUDGETS) {
    const input = baseInput(b.won);
    const after = matchMediaCatalog(catalog, input, 20);
    const before = matchMediaCatalog(
      catalog.map(cloneForLegacyScoring),
      input,
      20,
    );
    const afterIds = after.map((x) => x.media.id);
    const beforeIds = before.map((x) => x.media.id);
    const overlap = afterIds.filter((id) => beforeIds.includes(id)).length;
    top20ByBudget[b.label] = {
      before: before.map((x, i) => ({
        rank: i + 1,
        id: x.media.id,
        name: x.media.name,
        score: x.score,
        budgetPts: x.breakdown.budget,
        price: legacyMonthlyPriceWon(x.media),
      })),
      after: after.map((x, i) => ({
        rank: i + 1,
        id: x.media.id,
        name: x.media.name,
        score: x.score,
        budgetPts: x.breakdown.budget,
        price: resolveMonthlyListPriceWon(x.media),
      })),
      overlap,
      identical: afterIds.join("|") === beforeIds.join("|"),
    };
  }

  // Extreme manual checks
  const extremes = EXTREMES.map((spec) => {
    const m = catalog.find((x) => String(x.name ?? "").includes(spec.nameIncludes));
    if (!m) return { ...spec, found: false };
    const legacy = legacyMonthlyPriceWon(m);
    const display = resolveMonthlyListPriceWon(m);
    const { priceWon, period } = resolveMediaDisplayPrice(m);
    const bands = {};
    for (const b of BUDGETS) {
      bands[b.label] = {
        before: budgetBandForMedia(m, legacy, b.won),
        after: budgetBandForMedia(m, display, b.won),
      };
    }
    return {
      found: true,
      id: m.id,
      name: m.name,
      legacy,
      display,
      displayPriceWon: priceWon,
      displayPeriod: period,
      expectDisplayNear: spec.expectDisplayNear,
      displayMatchesExpectation:
        Math.abs(display - spec.expectDisplayNear) / spec.expectDisplayNear < 0.15,
      bands,
    };
  });

  // Band change counts among prior mismatches (legacy≠display, non-network, both >0)
  const mismatchIds = new Set(priceRows.map((r) => r.id));
  const bandChangeByBudget = {};
  for (const b of BUDGETS) {
    let n = 0;
    let qtyOnlyOver = 0;
    let displayOnlyOver = 0;
    for (const row of changedCases) {
      if (!mismatchIds.has(row.id)) continue;
      const ch = row.bandChanges[b.label];
      if (ch?.changed) n++;
      if (ch?.before === "over" && ch?.after !== "over") qtyOnlyOver++;
      if (ch?.before !== "over" && ch?.after === "over") displayOnlyOver++;
    }
    bandChangeByBudget[b.label] = { changed: n, qtyOnlyOver, displayOnlyOver };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    catalogSize: catalog.length,
    networkCount,
    nonNetworkPriceMismatch: mismatch,
    priceEqualApprox: matchEqual,
    changedBandAnyBudget,
    bandChangeByBudget,
    equalMediaRegressionFailures: equalRegression.length,
    equalRegressionSample: equalRegression.slice(0, 20),
    equalMediaChecked: equalIds.size,
    equalPortfolioPresenceShift,
    noteEqualScoreStable:
      "Equal-price media: scoreMediaForRanking budget/total unchanged. Portfolio top-N presence may shift when mismatch peers enter/leave.",
    quoteLine: {
      mediaQuantityTsUnchanged: quoteLineUntouched,
      quoteCalculatorTsUnchanged: quoteCalcUntouched,
      spotChecks: quoteLineSpot.length,
      spotAllFinite: quoteLineSpot.every((s) => s.defaultOk && s.units1Ok),
    },
    extremes,
    top20ByBudget,
    changedCases,
    topMismatchByRatio: priceRows.slice(0, 20),
  };

  writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));

  const md = `# #4-2 검증 — Matching 예산 = Display SSOT

생성: ${report.generatedAt}

## 견적 라인 무영향
- \`lib/media-quantity.ts\` git unchanged: **${quoteLineUntouched}**
- \`lib/quote-calculator.ts\` git unchanged: **${quoteCalcUntouched}**
- spot resolveMonthlyPriceForUnits finite: **${report.quoteLine.spotAllFinite}** (${quoteLineSpot.length} samples)

## 가격 경로
- 카탈로그: ${catalog.length} (network ${networkCount})
- non-network legacy≠display (both>0): **${mismatch}**
- 밴드 변경(아무 예산이라도): **${changedBandAnyBudget}**

## 예산별 밴드 변경 (기존 mismatch 집합 기준)
${BUDGETS.map(
  (b) =>
    `- ${b.label}: changed ${bandChangeByBudget[b.label].changed}, qty-only-over ${bandChangeByBudget[b.label].qtyOnlyOver}, display-only-over ${bandChangeByBudget[b.label].displayOnlyOver}`,
).join("\n")}

## 정상 매체(가격 일치) 회귀
- checked (non-network, legacy≈display): ${equalIds.size}
- **scoreMediaForRanking failures: ${equalRegression.length}** (기대 0)
- portfolio top200 presence shift (참고, 의도된 풀 재편): ${equalPortfolioPresenceShift}

## 극단 사례
${extremes
  .map((e) =>
    e.found
      ? `- **${e.name}**: legacy=${e.legacy}, display=${e.display}, expect~${e.expectDisplayNear}, ok=${e.displayMatchesExpectation}
  - 1천만: ${e.bands["1천만"].before.band} → ${e.bands["1천만"].after.band}
  - 3천만: ${e.bands["3천만"].before.band} → ${e.bands["3천만"].after.band}`
      : `- ${e.nameIncludes}: NOT FOUND`,
  )
  .join("\n")}

## top20 전/후 overlap
${BUDGETS.map(
  (b) =>
    `- ${b.label}: overlap ${top20ByBudget[b.label].overlap}/20, identical=${top20ByBudget[b.label].identical}`,
).join("\n")}

전체 변화 케이스: \`report.json\` → \`changedCases\` (${changedCases.length}건)
`;

  writeFileSync(path.join(OUT_DIR, "REPORT.md"), md);
  console.log(
    JSON.stringify(
      {
        out: OUT_DIR,
        mismatch,
        changedBandAnyBudget,
        equalRegressionFailures: equalRegression.length,
        equalPortfolioPresenceShift,
        quoteLineUntouched,
        extremesOk: extremes.every((e) => e.found && e.displayMatchesExpectation),
        top20: Object.fromEntries(
          BUDGETS.map((b) => [
            b.label,
            {
              overlap: top20ByBudget[b.label].overlap,
              identical: top20ByBudget[b.label].identical,
            },
          ]),
        ),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
