import assert from "node:assert/strict";
import test from "node:test";
import { calculateQuote } from "@/lib/quote-calculator";
import { parseQuoteMediaSelections } from "@/lib/quote-media-selections";
import { computeNetworkMonthlyPrice } from "@/lib/media-network-public";

const start = new Date("2025-06-01T12:00:00");
const end = new Date("2025-06-30T12:00:00");

test("legacy calculateQuote without selections unchanged", () => {
  const before = calculateQuote({
    media: [
      {
        id: "billboard-1",
        name: "강남 빌보드",
        location: "서울",
        type: "digital",
        price: 5_000_000,
      },
    ],
    startDate: start,
    endDate: end,
  });
  assert.equal(before.lines[0]!.lineSupplyWon, 5_000_000);
  assert.equal(before.lines[0]!.quantity, undefined);
});

test("legacy mobile with explicit quantity scales line total", () => {
  const result = calculateQuote({
    media: [
      {
        id: "bus-1",
        name: "버스 래핑",
        location: "서울",
        type: "mobile",
        price: 3_000_000,
        dailyFootfall: 500,
      },
    ],
    startDate: start,
    endDate: end,
    mediaSelections: [
      {
        mediaId: "bus-1",
        priceOptionIndex: 0,
        quantity: 3,
        quantityLabel: "3대",
        optionLabel: null,
        optionPriceWon: 3_000_000,
        lineTotalWon: 9_000_000,
      },
    ],
  });
  assert.equal(result.lines[0]!.lineSupplyWon, 9_000_000);
  assert.equal(result.lines[0]!.quantity, 3);
});

test("wizard path with priceOptionIndex unchanged subtotal", () => {
  const result = calculateQuote({
    media: [
      {
        id: "g-bus",
        name: "G버스 TV",
        location: "경기",
        type: "mobile",
        price: 64_000_000,
        priceOptions: [
          { label: "3회/시간", price: 64_000_000, period: "month" },
          { label: "1회/시간", price: 21_000_000, period: "month" },
        ],
      },
    ],
    startDate: start,
    endDate: end,
    periodKey: "1month",
    mediaPriceOptionIndex: { "g-bus": 1 },
    mediaSelections: [
      {
        mediaId: "g-bus",
        priceOptionIndex: 1,
        quantity: 1,
        quantityLabel: "1회/시간",
        optionLabel: "1회/시간",
        optionPriceWon: 21_000_000,
        lineTotalWon: 21_000_000,
      },
    ],
  });
  assert.equal(result.lines[0]!.lineSupplyWon, 21_000_000);
});

test("parseQuoteMediaSelections preserves quantity fields", () => {
  const parsed = parseQuoteMediaSelections([
    {
      mediaId: "nw_1",
      priceOptionIndex: 0,
      quantity: 87,
      quantityLabel: "87구좌",
      optionLabel: null,
      optionPriceWon: 3_000_000,
      lineTotalWon: 3_000_000,
    },
  ]);
  assert.equal(parsed?.[0]?.quantity, 87);
  assert.equal(parsed?.[0]?.quantityLabel, "87구좌");
});

test("network tier pricing uses package tier not pricePerUnit×qty", () => {
  const tiers = [
    { units: 1, price: 30_000 },
    { units: 87, price: 3_000_000 },
  ];
  const wrong = 60_000 * 87;
  const correct = computeNetworkMonthlyPrice(
    {
      pricePackage: null,
      pricePerUnit: 60_000,
      minUnits: 1,
      packageOptions: tiers,
    },
    87,
  );
  assert.equal(correct, 3_000_000);
  assert.notEqual(correct, wrong);
});
