import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { calculatePlan } from "@/lib/planner/calc/engine";
import { plannerMediaPeriodLineWon } from "@/lib/planner/planner-media-quantity";
import {
  buildCpmExclusionFootnote,
  categoryCpmBarsExcludingQuoteOnly,
  confirmedImpressionsExcludingQuoteOnly,
} from "@/lib/planner/quote-only-portfolio";

const PRICED_BILLBOARD = {
  id: "priced-billboard",
  name: "강남 빌보드",
  type: "static",
  location: "서울",
  region: "seoul",
  price: 2_000_000,
  lat: 37.5,
  lng: 127,
  dailyFootTraffic: 52_000,
  mediaMainCategory: "billboard",
  sampleImages: [],
} as MediaItem;

const QUOTE_WALL = {
  id: "quote-wall",
  name: "성수 외벽",
  type: "static",
  location: "서울",
  region: "seoul",
  price: 0,
  mediaSubCategory: "wall_mural",
  pricingMode: "quote_only",
  lat: 37.54,
  lng: 127.05,
  dailyFootTraffic: 175_000,
  sampleImages: [],
} as MediaItem;

function buildPlan(portfolio: MediaItem[]) {
  const pricing = {
    quantities: Object.fromEntries(portfolio.map((m) => [m.id, 1])),
  };
  const periodCtx = { months: 1 };
  return calculatePlan({
    media: portfolio.map((m) => ({
      media: m,
      units: 1,
      itemNet: plannerMediaPeriodLineWon(m, periodCtx, pricing, true),
    })),
    period: { kind: "months", months: 1 },
    budgetWon: 30_000_000,
    locale: "ko",
  });
}

test("confirmedImpressionsExcludingQuoteOnly — 협의가 노출 제외", () => {
  const portfolio = [PRICED_BILLBOARD, QUOTE_WALL];
  const plan = buildPlan(portfolio);
  const confirmed = confirmedImpressionsExcludingQuoteOnly(plan, portfolio);
  const wallImp =
    plan.mediaItems.find((r) => r.id === QUOTE_WALL.id)?.campaignImpressions ??
    0;
  assert.ok(wallImp > 0);
  assert.equal(confirmed, plan.impressions.campaignTotal - wallImp);
});

test("buildCpmExclusionFootnote — 분모 노출 숫자 명시", () => {
  const portfolio = [PRICED_BILLBOARD, QUOTE_WALL];
  const plan = buildPlan(portfolio);
  const footnote = buildCpmExclusionFootnote({ plan, portfolio, isKo: true });
  const imp = confirmedImpressionsExcludingQuoteOnly(plan, portfolio);
  assert.ok(footnote);
  assert.match(footnote!, new RegExp(imp.toLocaleString("ko-KR")));
  assert.match(footnote!, /문의 매체 제외/);
});

test("categoryCpmBarsExcludingQuoteOnly — 고정형 CPM 분모에서 협의가 제외", () => {
  const portfolio = [PRICED_BILLBOARD, QUOTE_WALL];
  const plan = buildPlan(portfolio);
  const rawStatic = plan.breakdown.byCategory.find((s) => s.key === "static");
  const bars = categoryCpmBarsExcludingQuoteOnly(plan, portfolio, true);
  const fixedBar = bars.find((b) => b.key === "static");
  assert.ok(rawStatic, "raw byCategory has static slice");
  assert.ok(fixedBar, "adjusted bars include static");
  assert.notEqual(
    rawStatic!.cpmWon,
    fixedBar!.value,
    "협의가 노출이 분모에 섞이면 CPM이 달라져야 함",
  );
  const expectedNet =
    plan.mediaItems.find((r) => r.id === PRICED_BILLBOARD.id)?.itemNet ?? 0;
  const expectedImp =
    plan.mediaItems.find((r) => r.id === PRICED_BILLBOARD.id)
      ?.campaignImpressions ?? 0;
  const expectedCpm = Math.round((expectedNet / expectedImp) * 1000);
  assert.equal(fixedBar!.value, expectedCpm);
});
