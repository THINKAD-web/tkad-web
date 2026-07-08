import assert from "node:assert/strict";
import test from "node:test";
import { partitionQuoteItemMediaIds } from "@/lib/admin-quote-to-ooh";
import { mapOohQuoteRecalcApiError } from "@/lib/ooh-quote-recalc-error";
import {
  customLinesFromBreakdown,
  mergeRecalcLines,
  resolveDbMediaIdsForRecalc,
} from "@/lib/ooh-quote-sync-breakdown";
import type { QuoteBreakdown } from "@/lib/quote-calculator";

test("partitionQuoteItemMediaIds splits db vs custom lines", () => {
  const { dbMediaIds, customLineIds } = partitionQuoteItemMediaIds([
    {
      id: "item-1",
      mediaId: "media-a",
      mediaName: "LED",
      spec: "",
      period: "2026-07-01 ~ 2026-07-31",
      unitPrice: 1000,
      quantity: 1,
      amount: 1000,
      quoteId: "q1",
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "item-2",
      mediaId: "custom-orphan-x",
      mediaName: "출력·시공비",
      spec: "",
      period: "2026-07-01 ~ 2026-07-31",
      unitPrice: 500,
      quantity: 1,
      amount: 500,
      quoteId: "q1",
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as never);
  assert.deepEqual(dbMediaIds, ["media-a"]);
  assert.deepEqual(customLineIds, ["custom-orphan-x"]);
});

test("resolveDbMediaIdsForRecalc falls back to breakdown non-custom ids", () => {
  const breakdown: QuoteBreakdown = {
    lines: [
      {
        mediaId: "custom-orphan-x",
        mediaName: "Custom",
        location: "",
        periodDays: 30,
        unitPriceWon: 100,
        lineSupplyWon: 100,
      },
      {
        mediaId: "media-b",
        mediaName: "Bus",
        location: "Seoul",
        periodDays: 30,
        unitPriceWon: 200,
        lineSupplyWon: 200,
      },
    ],
    subtotalWon: 300,
    discountRate: 0,
    discountWon: 0,
    supplyWon: 300,
    vatWon: 30,
    totalWon: 330,
    validUntil: "2026-07-22T00:00:00.000Z",
    issuedAt: "2026-07-08T00:00:00.000Z",
  };
  assert.deepEqual(resolveDbMediaIdsForRecalc([], breakdown), ["media-b"]);
  assert.deepEqual(customLinesFromBreakdown(breakdown).length, 1);
});

test("mergeRecalcLines keeps custom lines and refreshes db lines", () => {
  const stored: QuoteBreakdown = {
    lines: [
      {
        mediaId: "custom-orphan-x",
        mediaName: "Custom",
        location: "",
        periodDays: 30,
        unitPriceWon: 100,
        lineSupplyWon: 100,
      },
      {
        mediaId: "media-b",
        mediaName: "Old name",
        location: "",
        periodDays: 30,
        unitPriceWon: 200,
        lineSupplyWon: 200,
      },
    ],
    subtotalWon: 300,
    discountRate: 0,
    discountWon: 0,
    supplyWon: 300,
    vatWon: 30,
    totalWon: 330,
    validUntil: "2026-07-22T00:00:00.000Z",
    issuedAt: "2026-07-08T00:00:00.000Z",
  };
  const merged = mergeRecalcLines(stored, [
    {
      mediaId: "media-b",
      mediaName: "Fresh name",
      location: "Busan",
      periodDays: 30,
      unitPriceWon: 250,
      lineSupplyWon: 250,
      impressions: 1000,
    },
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0]!.lineSupplyWon, 100);
  assert.equal(merged[1]!.mediaName, "Fresh name");
  assert.equal(merged[1]!.lineSupplyWon, 250);
});

test("mapOohQuoteRecalcApiError returns localized messages", () => {
  const messages = {
    recalcCustomOnly: "custom only",
    recalcNoMedia: "no media",
    fallback: "fail",
  };
  assert.equal(
    mapOohQuoteRecalcApiError("recalc_custom_only", messages),
    "custom only",
  );
  assert.equal(mapOohQuoteRecalcApiError("recalc_no_media", messages), "no media");
});
