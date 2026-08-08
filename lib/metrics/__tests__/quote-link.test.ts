import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMediaQuoteDeeplinkPath,
  quoteOptionIdToIndex,
} from "@/lib/quote-deeplink";
import { buildMediaDetailQuoteHref } from "@/lib/media-detail-quantity";
import type { MediaItem } from "@/lib/media-data";

/** M-CITY — 실제 7일/15일/30일 상품. pricePeriod 는 "day" 로 잘못 기재돼 있다. */
const MCITY = {
  id: "m-city",
  name: "M-CITY",
  price: 70_000_000,
  pricePeriod: "day",
  priceOptions: [
    { label: "7일", price: 25_000_000, period: "week" },
    { label: "1개월", price: 70_000_000, period: "month" },
  ],
} as unknown as MediaItem;

test("D-06: 7일 집행 링크에 period=1day 가 실리지 않는다", () => {
  const href = buildMediaDetailQuoteHref(MCITY, { campaignDays: 7 });
  const q = new URLSearchParams(href.split("?")[1]);
  assert.equal(q.get("period"), "7days");
  assert.notEqual(q.get("period"), "1day");
  assert.equal(q.get("days"), "7");
});

test("D-06: 호출부가 잘못된 period 를 넘겨도 일수에서 유도한 값이 이긴다", () => {
  const href = buildMediaDetailQuoteHref(MCITY, {
    campaignDays: 7,
    period: "1day", // 기존 하드코딩 경로
  });
  const q = new URLSearchParams(href.split("?")[1]);
  assert.equal(q.get("period"), "7days");
});

test("D-06: 운영 6키에 없는 일수는 period 를 붙이지 않고 days 만 싣는다", () => {
  const href = buildMediaDetailQuoteHref(MCITY, { campaignDays: 10 });
  const q = new URLSearchParams(href.split("?")[1]);
  assert.equal(q.get("period"), null);
  assert.equal(q.get("days"), "10");
});

test("canonical 링크 — media / optionId / days", () => {
  const href = buildMediaQuoteDeeplinkPath(MCITY, { days: 30 });
  const q = new URLSearchParams(href.split("?")[1]);
  assert.equal(q.get("media"), "m-city");
  assert.equal(q.get("days"), "30");
  assert.equal(q.get("period"), "30days");
  // 30일 상품(po-1)이 정확히 매칭돼야 한다
  assert.equal(q.get("optionId"), "po-1");
  // 기존 리더 호환 파라미터도 함께
  assert.equal(q.get("campaignDays"), "30");
  assert.equal(q.get("po"), "1");
});

test("canonical 링크 — 7일 요청 시 7일 상품이 선택된다", () => {
  const href = buildMediaQuoteDeeplinkPath(MCITY, { days: 7 });
  const q = new URLSearchParams(href.split("?")[1]);
  assert.equal(q.get("days"), "7");
  assert.equal(q.get("optionId"), "po-0");
  assert.equal(q.get("period"), "7days");
});

test("quoteOptionIdToIndex — base/po-N 만 인정", () => {
  assert.equal(quoteOptionIdToIndex("base"), 0);
  assert.equal(quoteOptionIdToIndex("po-0"), 0);
  assert.equal(quoteOptionIdToIndex("po-3"), 3);
  assert.equal(quoteOptionIdToIndex("bogus"), null);
  assert.equal(quoteOptionIdToIndex(null), null);
  assert.equal(quoteOptionIdToIndex(""), null);
});
