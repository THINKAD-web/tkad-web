import assert from "node:assert/strict";
import test from "node:test";
import {
  sortMergedBrowseCatalog,
} from "./merged-media-browse.ts";
import {
  buildMediaBrowseDbWhere,
  mediaBrowseUsesDbPaginationOnly,
  sortBrowseCandidates,
} from "./media-browse-db-query.ts";
import type { MediaItem } from "./media-data.ts";
import {
  compareMediaByMonthlyEquivalentPrice,
  mediaMonthlyEquivalentSortWon,
  resolveMonthlyListPriceWon,
} from "./media-metrics.ts";
import { priceToMonthlyEquivalentWon } from "./media-price-format.ts";

function stubMedia(
  partial: Pick<MediaItem, "id" | "name" | "price"> & {
    pricePeriod?: MediaItem["pricePeriod"];
  },
): MediaItem {
  return {
    id: partial.id,
    slug: partial.id,
    name: partial.name,
    nameEn: partial.name,
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    type: "digital",
    price: partial.price,
    pricePeriod: partial.pricePeriod ?? "month",
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
  } as MediaItem;
}

/** 신세계형 일 단가 ₩2,200만 → 월 환산 ₩6.6억 */
const shinsegaeDay = stubMedia({
  id: "day-shinsegae",
  name: "신세계 스퀘어",
  price: 22_000_000,
  pricePeriod: "day",
});

/** 월 단가 ₩120만 */
const cheapMonth = stubMedia({
  id: "month-cheap",
  name: "월 120만 매체",
  price: 1_200_000,
  pricePeriod: "month",
});

/** 월 단가 ₩8,000만 (중간) */
const midMonth = stubMedia({
  id: "month-mid",
  name: "월 8000만 매체",
  price: 80_000_000,
  pricePeriod: "month",
});

test("monthly sort key: day 22M >> month 1.2M", () => {
  assert.equal(
    resolveMonthlyListPriceWon(shinsegaeDay),
    priceToMonthlyEquivalentWon(22_000_000, "day"),
  );
  assert.equal(
    resolveMonthlyListPriceWon(shinsegaeDay),
    mediaMonthlyEquivalentSortWon(shinsegaeDay),
  );
  assert.equal(mediaMonthlyEquivalentSortWon(cheapMonth), 1_200_000);
  assert.ok(
    mediaMonthlyEquivalentSortWon(shinsegaeDay) >
      mediaMonthlyEquivalentSortWon(cheapMonth),
  );
});

test("price_asc: month ₩120만 before day ₩2,200만", () => {
  const sorted = sortMergedBrowseCatalog(
    [shinsegaeDay, cheapMonth, midMonth],
    "price_asc",
  );
  assert.deepEqual(
    sorted.map((m) => m.id),
    ["month-cheap", "month-mid", "day-shinsegae"],
  );
});

test("price_desc: day ₩2,200만 (월 환산) first", () => {
  const sorted = sortMergedBrowseCatalog(
    [cheapMonth, shinsegaeDay, midMonth],
    "price_desc",
  );
  assert.deepEqual(
    sorted.map((m) => m.id),
    ["day-shinsegae", "month-mid", "month-cheap"],
  );
});

test("all-month catalog: price_asc order unchanged vs raw price", () => {
  const a = stubMedia({ id: "a", name: "A", price: 10_000_000 });
  const b = stubMedia({ id: "b", name: "B", price: 30_000_000 });
  const c = stubMedia({ id: "c", name: "C", price: 20_000_000 });
  const monthly = sortMergedBrowseCatalog([b, a, c], "price_asc").map(
    (m) => m.id,
  );
  const raw = [...[b, a, c]]
    .sort((x, y) => (x.price ?? 0) - (y.price ?? 0))
    .map((m) => m.id);
  assert.deepEqual(monthly, raw);
  assert.deepEqual(monthly, ["a", "c", "b"]);
});

test("compareMediaByMonthlyEquivalentPrice is stable on ties", () => {
  const a = stubMedia({ id: "z", name: "Z", price: 5_000_000 });
  const b = stubMedia({ id: "a", name: "A", price: 5_000_000 });
  assert.ok(compareMediaByMonthlyEquivalentPrice(a, b, "asc") > 0);
  assert.ok(compareMediaByMonthlyEquivalentPrice(b, a, "asc") < 0);
});

test("pagination preserves global monthly order across pages", () => {
  // queryMergedMediaBrowse: sort full filtered set, then slice — same here
  const catalog = [
    shinsegaeDay,
    cheapMonth,
    midMonth,
    stubMedia({ id: "m2", name: "M2", price: 3_000_000 }),
    stubMedia({ id: "m3", name: "M3", price: 50_000_000 }),
  ];
  const sorted = sortMergedBrowseCatalog(catalog, "price_asc");
  const page1 = sorted.slice(0, 2);
  const page2 = sorted.slice(2, 4);
  const page3 = sorted.slice(4, 6);

  assert.deepEqual(
    [...page1, ...page2, ...page3].map((m) => m.id),
    sorted.map((m) => m.id),
  );
  assert.equal(page1[0]!.id, "month-cheap");
  assert.ok(!page1.some((m) => m.id === "day-shinsegae"));
  assert.equal(sorted[sorted.length - 1]!.id, "day-shinsegae");
});

test("popular sort uses popularityScore without daily engagement reorder", () => {
  const highScore = {
    ...stubMedia({ id: "high", name: "High", price: 1 }),
    popularityScore: 500,
    dailyFootTraffic: 100,
  } as MediaItem;
  const lowScore = {
    ...stubMedia({ id: "low", name: "Low", price: 1 }),
    popularityScore: 50,
    dailyFootTraffic: 999_999,
  } as MediaItem;
  const sorted = sortBrowseCandidates([lowScore, highScore], "popular");
  assert.deepEqual(sorted.map((m) => m.id), ["high", "low"]);
});

test("mediaBrowseUsesDbPaginationOnly: price sort needs merge path", () => {
  assert.equal(
    mediaBrowseUsesDbPaginationOnly({ sort: "price_asc" }),
    false,
  );
  assert.equal(
    mediaBrowseUsesDbPaginationOnly({ sort: "popular", q: "강남" }),
    false,
  );
  assert.equal(
    mediaBrowseUsesDbPaginationOnly({ sort: "newest", mainCategory: "digital" }),
    true,
  );
});

test("buildMediaBrowseDbWhere includes active + not-flagged", () => {
  const where = buildMediaBrowseDbWhere({ sort: "popular", available: true });
  assert.ok(where.AND);
  const and = where.AND as Record<string, unknown>[];
  assert.ok(and.some((c) => "isActive" in c));
  assert.ok(
    and.some(
      (c) =>
        "reviewStatus" in c &&
        (c as { reviewStatus: { not: string } }).reviewStatus.not === "flagged",
    ),
  );
  assert.ok(and.some((c) => "availability" in c));
});

test("filter + sortBrowseCandidates pagination matches global order", () => {
  const catalog = [
    shinsegaeDay,
    cheapMonth,
    midMonth,
    stubMedia({ id: "m2", name: "M2", price: 3_000_000 }),
  ];
  const sorted = sortBrowseCandidates(catalog, "price_asc");
  const page1 = sorted.slice(0, 2);
  const page2 = sorted.slice(2, 4);
  assert.deepEqual(
    [...page1, ...page2].map((m) => m.id),
    sorted.map((m) => m.id),
  );
});
