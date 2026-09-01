import assert from "node:assert/strict";
import test from "node:test";
import type { AdminMediaDto } from "@/lib/admin-media-dto";
import {
  inclusiveDaysISO,
  type AdminQuoteBillingContext,
} from "@/lib/admin-quote-billing";
import { computeAdminQuoteTotals } from "@/lib/admin-quote-calc";
import {
  adminQuoteOnInquiryLabel,
  countAdminQuoteInquiryLines,
  formatAdminQuoteLineCell,
  isAdminQuoteLineOnInquiry,
} from "@/lib/admin-quote-inquiry";
import {
  adminQuoteLineAmounts,
  buildAdminQuoteLineItems,
  createCatalogQuoteLine,
  type AdminQuoteCatalogLine,
} from "@/lib/admin-quote-lines";

function formatWon(n: number, isKo: boolean): string {
  return `₩${Math.round(n).toLocaleString(isKo ? "ko-KR" : "en-US")}`;
}

const baseMedia = {
  region: "서울",
  type: "dooh",
  priceOptions: [] as AdminMediaDto["priceOptions"],
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
};

const inquiryMedia = {
  ...baseMedia,
  id: "seongsu-rect",
  name: "성수동 렉트",
  nameEn: "Seongsu Rect",
  location: "서울 성동구",
  price: 0,
} as AdminMediaDto;

const pricedMedia = {
  ...baseMedia,
  id: "priced-a",
  name: "정상 매체",
  nameEn: "Priced",
  location: "서울",
  price: 10_000_000,
  priceOptions: [{ label: "기본", price: 10_000_000, period: "month" }],
} as AdminMediaDto;

function billingCtx(): AdminQuoteBillingContext {
  const startDate = "2026-07-01";
  const endDate = "2026-07-31";
  return {
    mode: "calendar_months",
    calendarMonths: 1,
    presetDays: 30,
    days: inclusiveDaysISO(startDate, endDate),
    startDate,
    endDate,
  };
}

test("inquiry helpers: label + line detection", () => {
  assert.equal(adminQuoteOnInquiryLabel(true), "별도 문의");
  assert.equal(adminQuoteOnInquiryLabel(false), "On request");
  assert.equal(isAdminQuoteLineOnInquiry(0, 0), true);
  assert.equal(isAdminQuoteLineOnInquiry(0, 5_000_000), false);
  assert.equal(isAdminQuoteLineOnInquiry(1_200_000, 1_200_000), false);
});

test("formatAdminQuoteLineCell shows 별도 문의 when flagged", () => {
  assert.equal(
    formatAdminQuoteLineCell(0, true, formatWon, { priceOnInquiry: true }),
    "별도 문의",
  );
  assert.equal(
    formatAdminQuoteLineCell(0, true, formatWon, {
      unitPriceWon: 0,
      lineTotalWon: 0,
    }),
    "별도 문의",
  );
  assert.equal(
    formatAdminQuoteLineCell(5_000_000, true, formatWon, {
      unitPriceWon: 0,
      lineTotalWon: 5_000_000,
    }),
    "₩5,000,000",
  );
});

test("buildAdminQuoteLineItems: price≤0 → priceOnInquiry, amount 0", () => {
  const billing = billingCtx();
  const line = createCatalogQuoteLine(inquiryMedia.id);
  const items = buildAdminQuoteLineItems({
    lines: [line],
    medias: [inquiryMedia],
    isKo: true,
    campaignPeriodLabel: `${billing.startDate} ~ ${billing.endDate}`,
    billing,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0]?.priceOnInquiry, true);
  assert.equal(items[0]?.amount, 0);
  assert.equal(items[0]?.unitPrice, 0);
});

test("buildAdminQuoteLineItems: override clears inquiry + sets unit from amount", () => {
  const billing = billingCtx();
  const line: AdminQuoteCatalogLine = {
    ...createCatalogQuoteLine(inquiryMedia.id),
    amountOverrideWon: 60_000_000,
  };
  const items = buildAdminQuoteLineItems({
    lines: [line],
    medias: [inquiryMedia],
    isKo: true,
    campaignPeriodLabel: `${billing.startDate} ~ ${billing.endDate}`,
    billing,
  });
  assert.equal(items[0]?.priceOnInquiry, false);
  assert.equal(items[0]?.amount, 60_000_000);
  assert.equal(items[0]?.amountOverridden, true);
  assert.equal(items[0]?.unitPrice, 60_000_000);
});

test("mixed quote totals exclude inquiry lines without override", () => {
  const billing = billingCtx();
  const lines = [
    createCatalogQuoteLine(inquiryMedia.id),
    createCatalogQuoteLine(pricedMedia.id),
  ];
  const items = buildAdminQuoteLineItems({
    lines,
    medias: [inquiryMedia, pricedMedia],
    isKo: true,
    campaignPeriodLabel: `${billing.startDate} ~ ${billing.endDate}`,
    billing,
  });
  assert.equal(countAdminQuoteInquiryLines(items), 1);
  const totals = computeAdminQuoteTotals({
    lineWons: adminQuoteLineAmounts(items),
    discountPercent: 0,
    discountWon: 0,
    vatIncluded: false,
  });
  assert.equal(totals.linesSubtotalWon, 10_000_000);
  assert.equal(totals.supplyWon, 10_000_000);
  assert.equal(totals.vatWon, 1_000_000);
  assert.equal(totals.totalWon, 11_000_000);
});

test("inquiry override is included in totals", () => {
  const billing = billingCtx();
  const lines = [
    {
      ...createCatalogQuoteLine(inquiryMedia.id),
      amountOverrideWon: 3_000_000,
    },
    createCatalogQuoteLine(pricedMedia.id),
  ];
  const items = buildAdminQuoteLineItems({
    lines,
    medias: [inquiryMedia, pricedMedia],
    isKo: true,
    campaignPeriodLabel: `${billing.startDate} ~ ${billing.endDate}`,
    billing,
  });
  assert.equal(countAdminQuoteInquiryLines(items), 0);
  const totals = computeAdminQuoteTotals({
    lineWons: adminQuoteLineAmounts(items),
    discountPercent: 0,
    discountWon: 0,
    vatIncluded: false,
  });
  assert.equal(totals.linesSubtotalWon, 13_000_000);
});
