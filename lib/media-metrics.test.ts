import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateCatalogCpmWon,
  formatMonthlyImpressionsLabel,
  mediaMonthlyEquivalentSortWon,
  resolveCpmWon,
  resolveDisplayCpmWon,
  resolveMonthlyImpressions,
  resolveMonthlyListPriceWon,
} from "./media-metrics.ts";
import { priceToMonthlyEquivalentWon } from "./media-price-format.ts";

/** T1 — 광화문 루미형: 오염 stored CPM → 재계산 */
test("T1: resolveCpmWon discards inflated stored cpm", () => {
  const price = 51_351_300;
  const impressions = 1_900_000;
  const storedCpm = 469_100_359;
  const recalc = estimateCatalogCpmWon({ price, impressions });
  assert.ok(recalc != null);
  assert.ok(Math.abs(recalc! - 27_027) < 1);
  assert.equal(
    resolveCpmWon({ price, impressions, cpm: storedCpm }),
    Math.round(recalc!),
  );
});

/** T2 — 월노출 SSOT: impressions 우선 */
test("T2: resolveMonthlyImpressions prefers impressions over monthly/daily", () => {
  assert.equal(
    resolveMonthlyImpressions({
      impressions: 1_900_000,
      monthlyFootTraffic: 100,
      dailyFootTraffic: 50,
    }),
    1_900_000,
  );
  assert.equal(
    resolveMonthlyImpressions({
      impressions: undefined,
      monthlyFootTraffic: 500_000,
      dailyFootTraffic: 10_000,
    }),
    500_000,
  );
  assert.equal(
    resolveMonthlyImpressions({
      impressions: undefined,
      monthlyFootTraffic: undefined,
      dailyFootTraffic: 10_000,
    }),
    300_000,
  );
});

/** T3 — 목록 월가격: 일 단가 ×30 */
test("T3: resolveMonthlyListPriceWon converts day rate", () => {
  const m = { price: 22_000_000, pricePeriod: "day" as const };
  assert.equal(resolveMonthlyListPriceWon(m), 660_000_000);
  assert.equal(
    resolveMonthlyListPriceWon(m),
    mediaMonthlyEquivalentSortWon(m),
  );
});

/** T4 — 목록 월가격: 월 단가는 그대로 */
test("T4: resolveMonthlyListPriceWon keeps month rate", () => {
  const m = { price: 50_000_000, pricePeriod: "month" as const };
  assert.equal(resolveMonthlyListPriceWon(m), 50_000_000);
});

/** T5 — 라벨·CPM 동일 입력 → 카드/히어로 동일 */
test("T5: same inputs yield same impressions label and cpm across surfaces", () => {
  const m = {
    price: 51_351_300,
    impressions: 1_900_000,
    cpm: 469_100_359,
  };
  assert.equal(formatMonthlyImpressionsLabel(m, true), "1.9M");
  assert.equal(resolveCpmWon(m), 27_027);
  assert.equal(resolveDisplayCpmWon(m), estimateCatalogCpmWon(m));
});

/** T6 — 만 단위 오라벨 stored CPM */
test("T6: man-unit mis-stored cpm uses recalc", () => {
  const price = 50_000_000;
  const impressions = 1_900_000;
  const storedAsIfImp107 = price / (107 / 1000);
  assert.equal(
    resolveCpmWon({ price, impressions, cpm: storedAsIfImp107 }),
    Math.round(price / (impressions / 1000)),
  );
});

test("period multipliers shared via priceToMonthlyEquivalentWon", () => {
  assert.equal(priceToMonthlyEquivalentWon(1_000_000, "day"), 30_000_000);
  assert.equal(priceToMonthlyEquivalentWon(1_000_000, "week"), 4_000_000);
  assert.equal(priceToMonthlyEquivalentWon(1_000_000, "biweekly"), 2_000_000);
});

test("keeps stored cpm within ±15%", () => {
  const price = 51_351_300;
  const impressions = 1_900_000;
  const recalc = estimateCatalogCpmWon({ price, impressions })!;
  const storedNear = recalc * 1.1;
  assert.equal(
    resolveCpmWon({ price, impressions, cpm: storedNear }),
    Math.round(storedNear),
  );
});
