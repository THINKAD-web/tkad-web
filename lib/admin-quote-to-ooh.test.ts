import assert from "node:assert/strict";
import test from "node:test";
import { encodeAdminQuoteItemSpec } from "@/lib/admin-quote-line-spec";
import {
  buildAdminQuoteLineItems,
  adminQuoteLineAmounts,
  type AdminQuoteCatalogLine,
} from "@/lib/admin-quote-lines";
import { computeAdminQuoteTotals, monthFactorFromDays } from "@/lib/pricing";
import type { AdminMediaDto } from "@/lib/admin-media-dto";
import type { Quote, QuoteItem } from "@prisma/client";
import {
  assertAmountBridgeConsistent,
  buildOoHQuoteFromAdminQuote,
  manwonToWon,
  wonToManwon,
} from "@/lib/admin-quote-to-ooh";

const busMedia = {
  id: "bus-seoul",
  name: "서울시내버스",
  nameEn: "Seoul Bus",
  location: "서울",
  region: "서울",
  type: "버스",
  price: 1200000,
  priceOptions: [
    { label: "SSA", price: 1_500_000, period: "month" },
    { label: "A", price: 1_200_000, period: "month" },
  ],
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

function factorForPeriod(p: "month" | "biweekly" | "week" | "day", d: number) {
  if (p === "day") return d;
  if (p === "week") return d / 7;
  if (p === "biweekly") return d / 14;
  return monthFactorFromDays(d);
}

function buildMultilineQuote(opts: {
  discountWon?: number;
  vatIncluded?: boolean;
}): Quote & { items: QuoteItem[] } {
  const days = 30;
  const campaignPeriodLabel = "2026-07-01 ~ 2026-07-30";
  const lines: AdminQuoteCatalogLine[] = [
    {
      kind: "catalog",
      lineId: "l-ssa",
      mediaId: "bus-seoul",
      priceOptionIndex: 0,
      quantity: 40,
    },
    {
      kind: "catalog",
      lineId: "l-a",
      mediaId: "bus-seoul",
      priceOptionIndex: 1,
      quantity: 20,
    },
  ];
  const built = buildAdminQuoteLineItems({
    lines,
    medias: [busMedia],
    isKo: true,
    campaignPeriodLabel,
    days,
    factorForPeriod,
  });
  const lineWons = adminQuoteLineAmounts(built);
  const totals = computeAdminQuoteTotals({
    lineWons,
    discountPercent: 0,
    discountWon: opts.discountWon ?? 0,
    vatIncluded: opts.vatIncluded ?? false,
  });

  const items: QuoteItem[] = built.map((it, i) => ({
    id: `item-${i}`,
    quoteId: "q-test",
    mediaId: it.mediaId,
    mediaName: it.mediaName,
    spec: it.spec,
    period: it.period,
    unitPrice: it.unitPrice,
    quantity: it.quantity,
    amount: it.amount,
  }));

  return {
    id: "q-test",
    quoteNumber: "Q-2026-TEST",
    status: "sent",
    clientName: "테스트주식회사 · 홍길동",
    clientEmail: "test@example.com",
    clientPhone: "010-0000-0000",
    validUntil: new Date("2026-08-01T12:00:00.000Z"),
    subtotal: totals.linesSubtotalWon,
    discount: totals.discountTotalWon,
    tax: totals.vatWon,
    total: totals.totalWon,
    isKo: true,
    sentAt: new Date("2026-07-01T12:00:00.000Z"),
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
    items,
  };
}

test("wonToManwon / manwonToWon round-trip for 4080만 (SSA40+A20)", () => {
  const quote = buildMultilineQuote({});
  assert.equal(quote.subtotal, 84_000_000);
  assert.equal(wonToManwon(quote.total), 9240);
  assertAmountBridgeConsistent(quote.total, wonToManwon(quote.total));
  assert.equal(manwonToWon(wonToManwon(quote.total)), quote.total);
});

test("SSA 40대 + A 20대 bridge preserves line totals and 만원 total", () => {
  const quote = buildMultilineQuote({});
  const { totalAmountManwon, data } = buildOoHQuoteFromAdminQuote(quote);

  assert.equal(totalAmountManwon, 9240);
  assert.equal(data.totalAmount, 9240);
  assert.equal(manwonToWon(totalAmountManwon), quote.total);

  const selections = data.mediaSelections as Array<{
    mediaId: string;
    priceOptionIndex: number;
    quantity: number;
    lineTotalWon: number;
  }>;
  assert.equal(selections.length, 2);
  assert.equal(selections[0]?.quantity, 40);
  assert.equal(selections[0]?.priceOptionIndex, 0);
  assert.equal(selections[0]?.lineTotalWon, 60_000_000);
  assert.equal(selections[1]?.quantity, 20);
  assert.equal(selections[1]?.priceOptionIndex, 1);
  assert.equal(selections[1]?.lineTotalWon, 24_000_000);

  const breakdown = data.quoteBreakdown as { totalWon: number; subtotalWon: number };
  assert.equal(breakdown.subtotalWon, 84_000_000);
  assert.equal(breakdown.totalWon, quote.total);
});

test("bus grade + discount bridge amount matches Quote total", () => {
  const quote = buildMultilineQuote({ discountWon: 4_000_000 });
  const { totalAmountManwon } = buildOoHQuoteFromAdminQuote(quote);
  assert.equal(quote.total, 80_000_000 + Math.round(80_000_000 * 0.1));
  assert.equal(totalAmountManwon, wonToManwon(quote.total));
  assertAmountBridgeConsistent(quote.total, totalAmountManwon);
});

test("tkad:v1 spec preserved in mediaSelections quantityLabel", () => {
  const quote = buildMultilineQuote({});
  quote.items[0]!.spec = encodeAdminQuoteItemSpec("1920×1080", {
    priceOptionIndex: 0,
    quantityLabel: "40대",
  });
  const { data } = buildOoHQuoteFromAdminQuote(quote);
  const selections = data.mediaSelections as Array<{ quantityLabel?: string | null }>;
  assert.equal(selections[0]?.quantityLabel, "40대");
});

test("CLIENT_EMAIL_REQUIRED when email missing", () => {
  const quote = buildMultilineQuote({});
  quote.clientEmail = null;
  assert.throws(
    () => buildOoHQuoteFromAdminQuote(quote),
    (e: Error) => e.message === "CLIENT_EMAIL_REQUIRED",
  );
});
