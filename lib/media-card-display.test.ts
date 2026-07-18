import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogItemToDisplayModel,
  priceLabelIncludesPeriodSuffix,
} from "./media-card-display.ts";
import { formatMediaPriceWithPeriodSuffix } from "./media-price-format.ts";
import type { HomeCatalogMediaItem } from "./media-catalog-types.ts";

/** 신세계 스퀘어형 — 일 단가 등록 */
const shinsegaeDay: HomeCatalogMediaItem = {
  id: "shinsegae-square",
  name: "신세계백화점 본점 신세계 스퀘어 전광판 광고",
  price: 22_000_000,
  pricePeriod: "day",
  type: "digital",
  region: "서울",
};

/** 광화문 루미형 — 월 단가 등록 */
const gwanghwamunLumi: HomeCatalogMediaItem = {
  id: "gwanghwamun-lumi",
  name: "광화문 루미 미디어 전광판 광고",
  price: 50_000_000,
  pricePeriod: "month",
  type: "digital",
  region: "서울",
};

test("priceLabelIncludesPeriodSuffix detects embedded /일·/월", () => {
  assert.equal(priceLabelIncludesPeriodSuffix("₩2,200만/일", "일"), true);
  assert.equal(priceLabelIncludesPeriodSuffix("₩5,000만/월", "월"), true);
  assert.equal(priceLabelIncludesPeriodSuffix("₩2,200만", "일"), false);
  assert.equal(priceLabelIncludesPeriodSuffix("₩5,000만", "월"), false);
});

test("catalog tile model: day-rate media exposes /일 suffix (no parent label)", () => {
  const model = catalogItemToDisplayModel(shinsegaeDay, {
    href: `/media/${shinsegaeDay.id}`,
    isKo: true,
  });
  assert.equal(model.priceLabel, "₩2,200만");
  assert.equal(model.periodLabel, "일");
  assert.equal(model.showPeriodSuffix, true);
  assert.equal(`${model.priceLabel}/${model.periodLabel}`, "₩2,200만/일");
});

test("catalog tile model: month-rate media exposes /월 suffix (no parent label)", () => {
  const model = catalogItemToDisplayModel(gwanghwamunLumi, {
    href: `/media/${gwanghwamunLumi.id}`,
    isKo: true,
  });
  assert.equal(model.priceLabel, "₩5,000만");
  assert.equal(model.periodLabel, "월");
  assert.equal(model.showPeriodSuffix, true);
  assert.equal(`${model.priceLabel}/${model.periodLabel}`, "₩5,000만/월");
});

test("catalog tile model: bare parent priceLabel still gets period suffix", () => {
  const model = catalogItemToDisplayModel(shinsegaeDay, {
    href: `/media/${shinsegaeDay.id}`,
    isKo: true,
    priceLabel: "₩2,200만",
  });
  assert.equal(model.priceLabel, "₩2,200만");
  assert.equal(model.showPeriodSuffix, true);
  assert.equal(model.periodLabel, "일");
});

test("catalog tile model: parent label with /일 does not double the suffix", () => {
  const withPeriod = formatMediaPriceWithPeriodSuffix(
    shinsegaeDay.price!,
    shinsegaeDay.pricePeriod,
    "ko-KR",
  );
  const model = catalogItemToDisplayModel(shinsegaeDay, {
    href: `/media/${shinsegaeDay.id}`,
    isKo: true,
    priceLabel: withPeriod,
  });
  assert.equal(model.priceLabel, "₩2,200만/일");
  assert.equal(model.showPeriodSuffix, false);
});
