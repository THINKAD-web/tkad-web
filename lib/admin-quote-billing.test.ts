import assert from "node:assert/strict";
import test from "node:test";
import type { AdminMediaDto } from "@/lib/admin-media-dto";
import {
  endDateForCalendarMonths,
  endDateForDayPreset,
  inclusiveDaysISO,
  inferCalendarMonthsFromRange,
  syncBillingEndDate,
  type AdminQuoteBillingContext,
} from "@/lib/admin-quote-billing";
import {
  buildAdminQuoteLineItems,
  resolveAdminCatalogLineBilling,
  type AdminQuoteCatalogLine,
} from "@/lib/admin-quote-lines";

const ktMedia = {
  id: "cmnzdtqyf000204lbz82w6ipv",
  name: "광화문 KT 스퀘어 미디어월 전광판 광고",
  nameEn: "Gwanghwamun KT Square",
  location: "서울",
  region: "서울",
  type: "digital",
  price: 120_000_000,
  priceOptions: [
    { label: "영상(15초)", price: 120_000_000, period: "month" },
    { label: "영상(20초)", price: 120_000_000, period: "month" },
    { label: "영상(30초)", price: 120_000_000, period: "month" },
  ],
  partialPeriodRates: null,
  image: null,
  latitude: null,
  longitude: null,
  dailyFootfall: null,
  visibilityScore: 0,
  width: null,
  height: null,
  resolution: null,
  operatingHours: null,
  extractedImages: [],
} as AdminMediaDto;

const partialMedia = {
  ...ktMedia,
  id: "dig-partial",
  name: "부분요율 매체",
  price: 10_000_000,
  priceOptions: [{ label: "기본", price: 10_000_000, period: "month" }],
  partialPeriodRates: { "15days": 0.6 },
} as AdminMediaDto;

function monthsCtx(
  start: string,
  n: number,
): AdminQuoteBillingContext {
  const endDate = endDateForCalendarMonths(start, n);
  return {
    mode: "calendar_months",
    calendarMonths: n,
    presetDays: 15,
    days: inclusiveDaysISO(start, endDate),
    startDate: start,
    endDate,
  };
}

test("endDateForCalendarMonths: Jul 21 + 1mo → Aug 20 (31 inclusive days)", () => {
  assert.equal(endDateForCalendarMonths("2026-07-21", 1), "2026-08-20");
  assert.equal(inclusiveDaysISO("2026-07-21", "2026-08-20"), 31);
});

test("KT 1 calendar month = exactly 120,000,000 (ignores 31 days)", () => {
  const billing = monthsCtx("2026-07-21", 1);
  assert.equal(billing.days, 31);
  const r = resolveAdminCatalogLineBilling({
    media: ktMedia,
    priceOptionIndex: 0,
    quantity: 1,
    billing,
  });
  assert.equal(r.amount, 120_000_000);
  assert.equal(r.autoAmount, 120_000_000);
  assert.equal(r.usesMediaPartialRate, false);
  assert.equal(r.usesProRataFallback, false);
  assert.equal(r.amountOverridden, false);
});

test("KT 2 calendar months = exactly 240,000,000", () => {
  const billing = monthsCtx("2026-07-21", 2);
  const r = resolveAdminCatalogLineBilling({
    media: ktMedia,
    priceOptionIndex: 0,
    quantity: 1,
    billing,
  });
  assert.equal(r.amount, 240_000_000);
});

test("day_preset 15days keeps media partial rate 60%", () => {
  const endDate = endDateForDayPreset("2026-07-01", 15);
  const billing: AdminQuoteBillingContext = {
    mode: "day_preset",
    calendarMonths: 1,
    presetDays: 15,
    days: inclusiveDaysISO("2026-07-01", endDate),
    startDate: "2026-07-01",
    endDate,
  };
  const r = resolveAdminCatalogLineBilling({
    media: partialMedia,
    priceOptionIndex: 0,
    quantity: 1,
    billing,
  });
  assert.equal(r.amount, 6_000_000);
  assert.equal(r.usesMediaPartialRate, true);
  assert.equal(r.usesProRataFallback, false);
});

test("day_preset without rate → pro-rata fallback notice", () => {
  const endDate = endDateForDayPreset("2026-07-01", 15);
  const billing: AdminQuoteBillingContext = {
    mode: "day_preset",
    calendarMonths: 1,
    presetDays: 15,
    days: 15,
    startDate: "2026-07-01",
    endDate,
  };
  const r = resolveAdminCatalogLineBilling({
    media: ktMedia,
    priceOptionIndex: 0,
    quantity: 1,
    billing,
  });
  assert.equal(r.usesProRataFallback, true);
  assert.equal(r.usesMediaPartialRate, false);
  assert.equal(r.amount, Math.round(120_000_000 * (15 / 30)));
});

test("amount override replaces auto subtotal", () => {
  const billing = monthsCtx("2026-07-21", 1);
  const r = resolveAdminCatalogLineBilling({
    media: ktMedia,
    priceOptionIndex: 0,
    quantity: 1,
    billing,
    amountOverrideWon: 99_000_000,
  });
  assert.equal(r.autoAmount, 120_000_000);
  assert.equal(r.amount, 99_000_000);
  assert.equal(r.amountOverridden, true);
});

test("buildAdminQuoteLineItems persists override in spec meta", () => {
  const billing = monthsCtx("2026-07-21", 1);
  const line: AdminQuoteCatalogLine = {
    kind: "catalog",
    lineId: "l1",
    mediaId: ktMedia.id,
    priceOptionIndex: 0,
    quantity: 1,
    amountOverrideWon: 110_000_000,
  };
  const items = buildAdminQuoteLineItems({
    lines: [line],
    medias: [ktMedia],
    isKo: true,
    campaignPeriodLabel: `${billing.startDate} ~ ${billing.endDate}`,
    billing,
  });
  assert.equal(items[0]?.amount, 110_000_000);
  assert.equal(items[0]?.autoAmount, 120_000_000);
  assert.equal(items[0]?.amountOverridden, true);
  assert.match(items[0]?.spec ?? "", /amountOverrideWon/);
});

test("inferCalendarMonthsFromRange matches exact N-month windows", () => {
  assert.equal(
    inferCalendarMonthsFromRange("2026-08-01", "2026-08-31"),
    1,
  );
  assert.equal(
    inferCalendarMonthsFromRange("2026-08-01", "2026-09-30"),
    2,
  );
  assert.equal(
    inferCalendarMonthsFromRange("2026-08-01", "2026-08-30"),
    null,
  );
});

test("syncBillingEndDate calendar_months updates end/days", () => {
  const synced = syncBillingEndDate({
    mode: "calendar_months",
    calendarMonths: 1,
    presetDays: 15,
    startDate: "2026-07-21",
    endDate: "2099-01-01",
  });
  assert.equal(synced.endDate, "2026-08-20");
  assert.equal(synced.days, 31);
});
