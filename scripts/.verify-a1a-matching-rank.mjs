#!/usr/bin/env node
/**
 * A1a 배포 후 matching 추천 순위 회귀 — 가격 급변 매체의 비정상 상위 노출 점검.
 * Usage: node --import tsx scripts/.verify-a1a-matching-rank.mjs [catalog.json]
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { matchMediaCatalog } from "../lib/matching-engine.ts";
import { resolveMonthlyListPriceWon } from "../lib/media-metrics.ts";
import {
  A1A_MANUAL_REVIEW_BIWEEKLY_MEDIA,
  isA1aReadMappedPeriodRaw,
} from "../lib/media-price-period-read.ts";
import {
  normalizeMediaPricePeriod,
  resolveMediaDisplayPrice,
} from "../lib/media-price-format.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, ".verify-a1a-matching-rank");
const catalogPath =
  process.argv[2] ?? process.env.CATALOG_JSON ?? "/tmp/catalog-period-audit.json";

const BUDGETS = [
  { label: "1천만", won: 10_000_000 },
  { label: "3천만", won: 30_000_000 },
  { label: "5천만", won: 50_000_000 },
  { label: "1억", won: 100_000_000 },
];

function baseInput(budgetWon) {
  return {
    monthlyBudgetWon: budgetWon,
    regions: ["seoul"],
    industry: "beauty",
    targets: ["mz"],
    durationMonths: 1,
    goal: "awareness",
    seed: 42,
  };
}

function opts(m) {
  const o = m.priceOptions;
  if (typeof o === "string") {
    try {
      return JSON.parse(o);
    } catch {
      return [];
    }
  }
  return Array.isArray(o) ? o : [];
}

function isA1aAffected(m) {
  if (opts(m).some((o) => isA1aReadMappedPeriodRaw(String(o?.period ?? "")))) {
    return true;
  }
  const root = String(m.pricePeriod ?? "").trim();
  return isA1aReadMappedPeriodRaw(root);
}

function monthlyBeforeA1a(m) {
  const positive = opts(m).filter((o) => typeof o?.price === "number" && o.price > 0);
  let bestRaw = typeof m.price === "number" && m.price > 0 ? m.price : null;
  let bestPeriod = m.pricePeriod ?? "month";
  for (const o of positive) {
    if (bestRaw == null || o.price < bestRaw) {
      bestRaw = o.price;
      bestPeriod = o.period ?? m.pricePeriod ?? "month";
    }
  }
  if (bestRaw == null || bestRaw <= 0) return 0;
  const legacyPeriod =
    ["day", "week", "biweekly", "month"].includes(String(bestPeriod))
      ? bestPeriod
      : "month";
  const won = Math.round(bestRaw);
  switch (legacyPeriod) {
    case "day":
      return won * 30;
    case "week":
      return won * 4;
    case "biweekly":
      return won * 2;
    default:
      return won;
  }
}

const raw = readFileSync(catalogPath, "utf8");
const data = JSON.parse(raw);
const catalog = Array.isArray(data) ? data : data.items ?? data.data ?? [];

const affected = catalog.filter(isA1aAffected);
const manualIds = new Set(A1A_MANUAL_REVIEW_BIWEEKLY_MEDIA.map((x) => x.id));

const priceShifts = [];
for (const m of affected) {
  const before = monthlyBeforeA1a(m);
  const after = resolveMonthlyListPriceWon(m);
  if (before <= 0 || after <= 0) continue;
  const ratio = Math.max(before, after) / Math.min(before, after);
  if (Math.abs(before - after) > 1) {
    priceShifts.push({
      id: m.id,
      name: m.name,
      before,
      after,
      ratio,
      excluded: manualIds.has(m.id),
      display: resolveMediaDisplayPrice(m),
    });
  }
}
priceShifts.sort((a, b) => b.ratio - a.ratio);

const top20ByBudget = {};
const suspiciousTop10 = [];
for (const b of BUDGETS) {
  const ranked = matchMediaCatalog(catalog, baseInput(b.won), 200);
  const top20 = ranked.slice(0, 20).map((x, i) => ({
    rank: i + 1,
    id: x.media.id,
    name: x.media.name,
    score: x.score,
    monthly: resolveMonthlyListPriceWon(x.media),
    budgetPts: x.breakdown.budget,
  }));
  top20ByBudget[b.label] = top20;

  for (const row of top20) {
    const shift = priceShifts.find((s) => s.id === row.id);
    if (shift && shift.ratio >= 2 && row.rank <= 10) {
      suspiciousTop10.push({
        budget: b.label,
        rank: row.rank,
        ...shift,
        score: row.score,
        budgetPts: row.budgetPts,
      });
    }
  }
}

const myeongdong = catalog.find((m) =>
  String(m.name ?? "").includes("명동 미디어폴"),
);
const myeongdongCheck = myeongdong
  ? {
      found: true,
      before: monthlyBeforeA1a(myeongdong),
      after: resolveMonthlyListPriceWon(myeongdong),
      display: resolveMediaDisplayPrice(myeongdong),
      inTop20_10m: (top20ByBudget["1천만"] ?? []).some(
        (r) => r.id === myeongdong.id,
      ),
    }
  : { found: false };

const report = {
  generatedAt: new Date().toISOString(),
  catalogPath,
  catalogSize: catalog.length,
  a1aAffectedCount: affected.length,
  priceShiftCount: priceShifts.length,
  manualReviewExcluded: A1A_MANUAL_REVIEW_BIWEEKLY_MEDIA.map((m) => m.id),
  myeongdongCheck,
  suspiciousTop10,
  top20ByBudget,
  topPriceShifts: priceShifts.slice(0, 30),
  pass:
    suspiciousTop10.length === 0 &&
    myeongdongCheck.found &&
    !myeongdongCheck.inTop20_10m,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));

const md = `# A1a matching 순위 회귀

생성: ${report.generatedAt}

## 요약
- A1a 영향 매체: ${affected.length}
- 월환산 변화: ${priceShifts.length}건
- **의심 top10 진입 (ratio≥2 & rank≤10): ${suspiciousTop10.length}** (기대 0)
- 명동 미디어폴 1천만 top20: ${myeongdongCheck.inTop20_10m ? "YES ⚠️" : "NO ✓"}

## 명동 미디어폴
${myeongdongCheck.found
  ? `- before monthly: ${myeongdongCheck.before?.toLocaleString()}
- after monthly: ${myeongdongCheck.after?.toLocaleString()}
- display: ₩${myeongdongCheck.display?.priceWon?.toLocaleString()} / ${myeongdongCheck.display?.period}`
  : "- NOT FOUND"}

## top20 overlap (참고)
${BUDGETS.map((b) => {
  const t = top20ByBudget[b.label] ?? [];
  const affectedInTop = t.filter((r) => priceShifts.some((s) => s.id === r.id && s.ratio >= 2));
  return `- ${b.label}: ${affectedInTop.length}건 (ratio≥2) in top20`;
}).join("\n")}
`;

writeFileSync(path.join(OUT_DIR, "REPORT.md"), md);

console.log(
  JSON.stringify(
    {
      out: OUT_DIR,
      pass: report.pass,
      suspiciousTop10: suspiciousTop10.length,
      myeongdongTop20_10m: myeongdongCheck.inTop20_10m,
      priceShiftCount: priceShifts.length,
    },
    null,
    2,
  ),
);

if (!report.pass) process.exitCode = 1;
