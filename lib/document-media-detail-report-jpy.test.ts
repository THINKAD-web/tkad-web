import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "./media-data.ts";
import { mediaItemToExportRow } from "./document-media-detail.ts";
import { buildOohReportPayload } from "./planner-report-export/payload-ooh.ts";
import type { PlannerMetrics } from "./planner-logic.ts";

const ORIGINAL_RATE = process.env.KRW_JPY_RATE;
const ORIGINAL_AS_OF = process.env.KRW_JPY_RATE_AS_OF;

test.after(() => {
  if (ORIGINAL_RATE === undefined) delete process.env.KRW_JPY_RATE;
  else process.env.KRW_JPY_RATE = ORIGINAL_RATE;
  if (ORIGINAL_AS_OF === undefined) delete process.env.KRW_JPY_RATE_AS_OF;
  else process.env.KRW_JPY_RATE_AS_OF = ORIGINAL_AS_OF;
});

function jpMedia(price: number): MediaItem {
  return {
    id: "jp-shibuya",
    name: "渋谷スクランブル交差点",
    type: "dooh",
    location: "Tokyo Shibuya",
    region: "overseas",
    country: "JP",
    price,
    lat: 35.659,
    lng: 139.7,
    dailyFootTraffic: 200_000,
    sampleImages: [],
  };
}

function krMedia(price: number): MediaItem {
  return {
    id: "kr-gangnam",
    name: "강남 테스트",
    type: "dooh",
    location: "서울 강남",
    region: "seoul",
    country: "KR",
    price,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 100_000,
    sampleImages: [],
  };
}

test("formatKrwPrimaryWithJpyFootnote via export row: JP has ¥ footnote, KR does not", () => {
  process.env.KRW_JPY_RATE = "0.1";
  const jpRow = mediaItemToExportRow(jpMedia(1_000_000), true, { months: 1 });
  assert.match(jpRow.monthlyPriceLabel ?? "", /^₩/);
  assert.match(jpRow.monthlyPriceLabel ?? "", /¥100,000/);
  assert.match(jpRow.lineTotalLabel ?? "", /¥100,000/);

  const krRow = mediaItemToExportRow(krMedia(1_000_000), true, { months: 1 });
  assert.match(krRow.monthlyPriceLabel ?? "", /^₩100만/);
  assert.ok(!krRow.monthlyPriceLabel?.includes("¥"));
  assert.ok(!krRow.lineTotalLabel?.includes("¥"));
});

test("buildOohReportPayload: JP mix → currencyFootnote + ¥ labels; charts stay KRW", () => {
  process.env.KRW_JPY_RATE = "0.1126";
  process.env.KRW_JPY_RATE_AS_OF = "2026-08-18";

  const metrics = {
    estimatedMonthlyImpressions: 500_000,
    estimatedTotalImpressions: 500_000,
    blendedCpmKrw: 12_000,
  } as PlannerMetrics;

  const payload = buildOohReportPayload({
    isKo: true,
    goalTitle: "일본 테스트",
    budgetMan: 5000,
    periodDisplay: "2026-09-01 ~ 2026-09-30 (1개월)",
    regionsText: "도쿄",
    categoriesText: "디지털",
    ageText: "전 연령",
    industryText: "리테일",
    portfolio: [jpMedia(22_000_000), krMedia(5_000_000)],
    metrics,
    blendedCpmKrw: 12_000,
    budgetAllocation: [
      { key: "digital", label: "디지털", pct: 100, valueWon: 27_000_000, actualWon: 27_000_000 },
    ],
    cpmBars: [{ key: "digital", label: "디지털", value: 12_000 }],
    effectSummaryLines: [],
    generatedAt: "2026-08-19",
    months: 1,
  });

  const jpPortfolioRow = payload.portfolio.find((r) => r.name.includes("渋谷"));
  const krPortfolioRow = payload.portfolio.find((r) => r.name.includes("강남"));

  assert.ok(jpPortfolioRow);
  assert.match(jpPortfolioRow!.monthlyPriceLabel ?? "", /¥/);
  assert.match(jpPortfolioRow!.monthlyPriceLabel ?? "", /^₩/);

  assert.ok(krPortfolioRow);
  assert.ok(!krPortfolioRow!.monthlyPriceLabel?.includes("¥"));

  assert.ok(payload.currencyFootnote?.includes("0.1126"));
  assert.ok(payload.currencyFootnote?.includes("2026-08-18"));

  const cpmChart = payload.charts?.cpmBars ?? [];
  assert.ok(cpmChart.length > 0);
  assert.equal(cpmChart[0]!.value, 12_000);

  const budgetSplit = payload.charts?.budgetSplit ?? [];
  assert.ok(budgetSplit.length > 0);
  assert.equal(budgetSplit[0]!.value, 27_000_000);
  assert.ok(!String(budgetSplit[0]!.value).includes("¥"));
});
