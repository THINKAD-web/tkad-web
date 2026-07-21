/**
 * Similar-carousel price contract — must match detail/list display SSOT
 * (`resolveMediaDisplayPrice` → `formatMediaDisplayPrice`), not raw `m.price`.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCatalogPriceFieldWon,
  formatMediaDisplayPrice,
  resolveMediaDisplayPrice,
} from "./media-price-format.ts";
import type { MediaItem } from "./media-data.ts";

/** 신세계 스퀘어형 — raw month list price + cheaper day option */
const shinsegaeSquare = {
  id: "shinsegae-square",
  name: "신세계백화점 본점 신세계 스퀘어 전광판 광고",
  price: 110_000_000,
  pricePeriod: "month",
  priceOptions: [
    {
      label: "일 단가",
      price: 22_000_000,
      period: "day",
    },
    {
      label: "월 단가",
      price: 110_000_000,
      period: "month",
    },
  ],
} satisfies Pick<MediaItem, "id" | "name" | "price" | "pricePeriod" | "priceOptions">;

/** 광화문 루미형 — 20초/30초 옵션, 최저가 기준 */
const gwanghwamunLumi = {
  id: "gwanghwamun-lumi",
  name: "광화문 루미 미디어 전광판 광고",
  price: 60_000_000,
  pricePeriod: "month",
  priceOptions: [
    { label: "30초", price: 60_000_000, period: "month" },
    { label: "20초", price: 50_000_000, period: "month" },
  ],
} satisfies Pick<MediaItem, "id" | "name" | "price" | "pricePeriod" | "priceOptions">;

test("similar carousel: 신세계 uses cheapest day option, not raw month price", () => {
  const display = resolveMediaDisplayPrice(shinsegaeSquare);
  assert.equal(display.priceWon, 22_000_000);
  assert.equal(display.period, "day");

  const label = formatMediaDisplayPrice(shinsegaeSquare, "ko-KR");
  assert.equal(label, "₩2,200만/일");

  // Regression: previous carousel rendered raw m.price + period key
  const legacyRaw = formatCatalogPriceFieldWon(shinsegaeSquare.price);
  assert.equal(legacyRaw, "₩1.1억");
  assert.notEqual(label, legacyRaw);
});

test("similar carousel: 루미 uses cheapest option among 20초/30초", () => {
  const display = resolveMediaDisplayPrice(gwanghwamunLumi);
  assert.equal(display.priceWon, 50_000_000);
  assert.equal(display.period, "month");

  const label = formatMediaDisplayPrice(gwanghwamunLumi, "ko-KR");
  assert.equal(label, "₩5,000만/월");
});

test("similar carousel: EN locale keeps period suffix form", () => {
  assert.equal(
    formatMediaDisplayPrice(shinsegaeSquare, "en-US"),
    "₩22M/per day",
  );
  assert.equal(
    formatMediaDisplayPrice(gwanghwamunLumi, "en-US"),
    "₩50M/per month",
  );
});
