/**
 * PR4.5 — raw-price display sweep contract.
 * Surfaces must use `formatMediaDisplayPrice` (cheapest option + /일·/월).
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCatalogPriceFieldWon,
  formatMediaDisplayPrice,
  resolveMediaDisplayPrice,
} from "./media-price-format.ts";
import { mediaItemToRecentlyViewedRecord } from "./recently-viewed.ts";
import type { MediaItem } from "./media-data.ts";

const shinsegaeSquare = {
  id: "shinsegae-square",
  name: "신세계백화점 본점 신세계 스퀘어 전광판 광고",
  nameEn: "Shinsegae Square",
  type: "digital",
  region: "seoul",
  price: 110_000_000,
  pricePeriod: "month",
  priceOptions: [
    { label: "일 단가", price: 22_000_000, period: "day" },
    { label: "월 단가", price: 110_000_000, period: "month" },
  ],
} as MediaItem;

const gwanghwamunLumi = {
  id: "gwanghwamun-lumi",
  name: "광화문 루미 미디어 전광판 광고",
  nameEn: "Gwanghwamun Lumi",
  type: "digital",
  region: "seoul",
  price: 60_000_000,
  pricePeriod: "month",
  priceOptions: [
    { label: "30초", price: 60_000_000, period: "month" },
    { label: "20초", price: 50_000_000, period: "month" },
  ],
} as MediaItem;

const surfaces = [
  "media-ai-recommend-panel",
  "recently-viewed-media",
  "media-search-autocomplete",
  "home-recently-viewed",
  "recently-viewed-section",
  "compare-spec-table",
  "media-browse-catalog-server",
] as const;

for (const surface of surfaces) {
  test(`${surface}: 신세계 display SSOT is ₩2,200만/일 (not raw ₩1.1억)`, () => {
    const label = formatMediaDisplayPrice(shinsegaeSquare, "ko-KR");
    assert.equal(label, "₩2,200만/일");
    assert.equal(formatCatalogPriceFieldWon(shinsegaeSquare.price), "₩1.1억");
  });

  test(`${surface}: 루미 display SSOT is ₩5,000만/월 (cheapest option)`, () => {
    assert.equal(
      formatMediaDisplayPrice(gwanghwamunLumi, "ko-KR"),
      "₩5,000만/월",
    );
  });
}

test("recently-viewed record stores display price+period for home/my cards", () => {
  const record = mediaItemToRecentlyViewedRecord(shinsegaeSquare, {
    isKo: true,
  });
  assert.equal(record.price, 22_000_000);
  assert.equal(record.pricePeriod, "day");
  assert.equal(
    formatMediaDisplayPrice(
      { price: record.price, pricePeriod: record.pricePeriod },
      "ko-KR",
    ),
    "₩2,200만/일",
  );

  const lumi = mediaItemToRecentlyViewedRecord(gwanghwamunLumi);
  assert.equal(lumi.price, 50_000_000);
  assert.equal(lumi.pricePeriod, "month");
  assert.equal(
    formatMediaDisplayPrice(
      { price: lumi.price, pricePeriod: lumi.pricePeriod },
      "ko-KR",
    ),
    "₩5,000만/월",
  );
});

test("resolveMediaDisplayPrice matches formatMediaDisplayPrice inputs", () => {
  const d = resolveMediaDisplayPrice(shinsegaeSquare);
  assert.deepEqual(d, { priceWon: 22_000_000, period: "day" });
});
