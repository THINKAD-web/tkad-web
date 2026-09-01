import assert from "node:assert/strict";
import { test } from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { PlanCartItem } from "@/lib/plan-cart";
import {
  groupPlanCartReportPortfolio,
  orderPortfolioByCartItems,
  resolveReportPortfolioOrder,
  sortPlanCartReportPortfolio,
} from "./sort-portfolio";

function media(id: string, name: string, region = "seoul"): MediaItem {
  return {
    id,
    name,
    nameEn: name,
    location: "",
    locationEn: "",
    region,
    type: "dooh",
    price: 1_000_000,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 1000,
    sampleImages: [],
  };
}

function cartItem(mediaId: string): PlanCartItem {
  return {
    mediaId,
    mediaName: mediaId,
    mediaType: "digital",
    region: "seoul",
    price: 1_000_000,
    addedFrom: "search",
    addedAt: new Date().toISOString(),
  };
}

test("orderPortfolioByCartItems — 담은 순서 유지", () => {
  const portfolio = [
    media("c", "선릉역"),
    media("a", "강남역"),
    media("b", "역삼역"),
  ];
  const ordered = orderPortfolioByCartItems(portfolio, [
    cartItem("a"),
    cartItem("b"),
    cartItem("c"),
  ]);
  assert.deepEqual(
    ordered.map((m) => m.id),
    ["a", "b", "c"],
  );
});

test("resolveReportPortfolioOrder — cart 없으면 이름 그룹 fallback", () => {
  const portfolio = [
    media("z", "zzz"),
    media("a", "aaa"),
  ];
  const fallback = resolveReportPortfolioOrder(portfolio);
  const sorted = sortPlanCartReportPortfolio(portfolio);
  assert.deepEqual(
    fallback.map((m) => m.id),
    sorted.map((m) => m.id),
  );
});

test("resolveReportPortfolioOrder — manualOrder 최우선", () => {
  const portfolio = [
    media("a", "강남역"),
    media("b", "역삼역"),
    media("c", "선릉역"),
  ];
  const ordered = resolveReportPortfolioOrder(portfolio, {
    manualOrder: ["c", "a"],
    cartItems: [cartItem("a"), cartItem("b"), cartItem("c")],
  });
  assert.deepEqual(ordered.map((m) => m.id), ["c", "a", "b"]);
});

test("groupPlanCartReportPortfolio — cart 순서 flatten 일치", () => {
  const portfolio = [
    media("c", "선릉역"),
    media("a", "강남역"),
    media("b", "역삼역"),
  ];
  const opts = {
    cartItems: [cartItem("a"), cartItem("b"), cartItem("c")],
  };
  const flat = resolveReportPortfolioOrder(portfolio, opts);
  const groups = groupPlanCartReportPortfolio(portfolio, true, opts);
  const fromGroups = groups.flatMap((g) =>
    g.categories.flatMap((c) => c.items),
  );
  assert.deepEqual(fromGroups.map((m) => m.id), flat.map((m) => m.id));
  assert.deepEqual(flat.map((m) => m.name), ["강남역", "역삼역", "선릉역"]);
});
