import assert from "node:assert/strict";
import test from "node:test";
import {
  A1A_MANUAL_REVIEW_BIWEEKLY_MEDIA,
  collectNonA1aPricePeriods,
  isA1aManualReviewBiweeklyMedia,
  normalizeMediaPricePeriodRead,
} from "./media-price-period-read.ts";
import {
  getCheapestMediaPriceOption,
  normalizeMediaPricePeriod,
  priceToMonthlyEquivalentWon,
  resolveMediaDisplayPrice,
} from "./media-price-format.ts";
import { resolveMonthlyListPriceWon } from "./media-metrics.ts";

test("A1a read mapping: day/week/biweekly/month aliases", () => {
  assert.equal(normalizeMediaPricePeriodRead("1일"), "day");
  assert.equal(normalizeMediaPricePeriodRead("7일"), "week");
  assert.equal(normalizeMediaPricePeriodRead("1주"), "week");
  assert.equal(normalizeMediaPricePeriodRead("15일"), "biweekly");
  assert.equal(normalizeMediaPricePeriodRead("2주"), "biweekly");
  assert.equal(normalizeMediaPricePeriodRead("1개월"), "month");
  assert.equal(normalizeMediaPricePeriodRead("월"), "month");
  assert.equal(normalizeMediaPricePeriodRead("monthly"), "month");
  assert.equal(normalizeMediaPricePeriod("day"), "day");
});

test("A1b/A1c unmapped periods fall back to month", () => {
  for (const raw of ["2개월", "12개월", "시즌", "campaign", "10일", "1회", "1시간"]) {
    assert.equal(normalizeMediaPricePeriodRead(raw), "month", raw);
  }
});

test("manual review 5 media: 2주 stays month fallback", () => {
  for (const m of A1A_MANUAL_REVIEW_BIWEEKLY_MEDIA) {
    const ctx = { mediaId: m.id, mediaName: m.fullName };
    assert.equal(
      normalizeMediaPricePeriodRead("2주", ctx),
      "month",
      m.fullName,
    );
    assert.equal(isA1aManualReviewBiweeklyMedia(ctx), true);
  }
});

test("명동 미디어폴: 1일 패키지 display + monthly list price", () => {
  const media = {
    id: "cmquwmka0000604l2qyl38ys7",
    name: "명동 미디어폴 디지털 광고",
    price: 10_000_000,
    pricePeriod: "month" as const,
    priceOptions: [
      { label: "1개월 패키지", price: 10_000_000, period: "month" },
      { label: "15일 패키지", price: 6_000_000, period: "15일" },
      { label: "7일 패키지", price: 3_500_000, period: "7일" },
      { label: "1일 패키지 (팬클럽 한정)", price: 700_000, period: "1일" },
    ],
  };
  const display = resolveMediaDisplayPrice(media);
  assert.equal(display.priceWon, 700_000);
  assert.equal(display.period, "day");
  assert.equal(resolveMonthlyListPriceWon(media), 700_000 * 30);
  assert.equal(
    priceToMonthlyEquivalentWon(700_000, "1일"),
    21_000_000,
  );
});

test("2주 clean media: biweekly monthly equivalent", () => {
  const media = {
    name: "명동 고려빌딩 전광판 광고",
    price: 10_000_000,
    pricePeriod: "month" as const,
    priceOptions: [
      { label: "20초 개별 (1개월)", price: 10_000_000, period: "month" },
      { label: "20초 개별 (2주)", price: 5_500_000, period: "2주" },
    ],
  };
  const cheapest = getCheapestMediaPriceOption(media);
  assert.equal(cheapest?.priceWon, 5_500_000);
  assert.equal(cheapest?.period, "biweekly");
  assert.equal(resolveMonthlyListPriceWon(media), 11_000_000);
});

test("collectNonA1aPricePeriods skips A1a values", () => {
  const rows = collectNonA1aPricePeriods([
    {
      id: "a",
      name: "test",
      pricePeriod: "month",
      priceOptions: [{ period: "2주" }, { period: "campaign" }],
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.period, "campaign");
});
