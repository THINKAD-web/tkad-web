/**
 * 반달 상품이 없는 매체 — 경고(`MEDIA_NO_PARTIAL_RATE_TIER`)와 각주.
 *
 * 정책: 표시 금액은 선형 환산으로 통일하되, 청구 기준이 협상으로 갈릴 수 있는
 * 매체가 있으면 상한을 명시한다. 시스템이 한쪽 숫자로 단정하지 않는다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { buildPartialRateNotice } from "@/lib/planner/partial-rate-notice";
import { calculatePlan } from "@/lib/planner/calc/engine";
import { mediaMinSellableDaysAbove } from "@/lib/metrics/media-price-adapter";

function media(o: Partial<MediaItem> & Pick<MediaItem, "id">): MediaItem {
  return {
    name: o.id, nameEn: o.id, location: "서울", locationEn: "Seoul",
    region: "seoul", regionMain: "seoul", type: "dooh", price: 0,
    lat: 37.5, lng: 127, dailyFootTraffic: 10_000, sampleImages: [],
    pricePeriod: "month",
    ...o,
  } as MediaItem;
}

/** 월 상품만 등록 — 14일 상품이 없다 */
const MONTHLY_ONLY = media({
  id: "m-monthly", name: "월단위 매체", price: 5_000_000,
});

/** 7일 상품이 등록돼 있어 14일도 보간 가능 */
const HAS_SHORT = media({
  id: "m-short", name: "주단위 매체", price: 5_000_000,
  priceOptions: [{ label: "7일", price: 1_200_000, period: "week" }],
} as Partial<MediaItem> & Pick<MediaItem, "id">);

// ── 판정 ───────────────────────────────────────────────────────────────────

test("월 상품만 있는 매체는 14일 기준 최소 판매 단위 30일로 판정된다", () => {
  assert.equal(mediaMinSellableDaysAbove(MONTHLY_ONLY, 14), 30);
});

test("더 짧은 상품이 있으면 판정되지 않는다", () => {
  assert.equal(mediaMinSellableDaysAbove(HAS_SHORT, 14), null);
});

test("기간이 최소 판매 단위 이상이면 판정되지 않는다", () => {
  assert.equal(mediaMinSellableDaysAbove(MONTHLY_ONLY, 30), null);
  assert.equal(mediaMinSellableDaysAbove(MONTHLY_ONLY, 45), null);
});

// ── 엔진 경고 ──────────────────────────────────────────────────────────────

test("엔진이 MEDIA_NO_PARTIAL_RATE_TIER 경고를 낸다", () => {
  const plan = calculatePlan({
    media: [{ media: MONTHLY_ONLY, itemNet: 2_333_333 }],
    period: { kind: "days", days: 14 },
    budgetWon: 30_000_000,
  });
  const w = plan.warnings.filter((x) => x.code === "MEDIA_NO_PARTIAL_RATE_TIER");
  assert.equal(w.length, 1);
  assert.equal(w[0]?.mediaId, "m-monthly");
  assert.equal(w[0]?.kind, "data", "운영 데이터 쪽 사정이다");
});

test("30일 캠페인에서는 경고가 없다", () => {
  const plan = calculatePlan({
    media: [{ media: MONTHLY_ONLY, itemNet: 5_000_000 }],
    period: { kind: "days", days: 30 },
    budgetWon: 30_000_000,
  });
  assert.equal(
    plan.warnings.filter((x) => x.code === "MEDIA_NO_PARTIAL_RATE_TIER").length,
    0,
  );
});

// ── 각주 ───────────────────────────────────────────────────────────────────

test("전체가 월단위면 상한이 월정가 합이다", () => {
  const notice = buildPartialRateNotice({
    portfolio: [MONTHLY_ONLY, media({ id: "m2", name: "둘째", price: 7_500_000 })],
    days: 14,
    displayedLineWonById: { "m-monthly": 2_333_333, m2: 3_500_000 },
    isKo: true,
  });
  assert.ok(notice);
  assert.equal(notice.affectedMediaIds.length, 2);
  assert.equal(notice.maxBillableWon, 12_500_000, "5,000,000 + 7,500,000");
  assert.match(notice.text, /월 단위로만/);
  assert.match(notice.text, /1,250만원/);
  assert.match(notice.text, /기간 비례/);
});

test("일부만 해당하면 그 매체만 월정가로 잡고 나머지는 표시액을 쓴다", () => {
  const notice = buildPartialRateNotice({
    portfolio: [MONTHLY_ONLY, HAS_SHORT],
    days: 14,
    displayedLineWonById: { "m-monthly": 2_333_333, "m-short": 2_400_000 },
    isKo: true,
  });
  assert.ok(notice);
  assert.deepEqual(notice.affectedMediaIds, ["m-monthly"]);
  assert.equal(notice.maxBillableWon, 5_000_000 + 2_400_000);
  assert.match(notice.text, /1개 매체는/);
});

test("해당 매체가 없으면 각주를 만들지 않는다", () => {
  assert.equal(
    buildPartialRateNotice({
      portfolio: [HAS_SHORT],
      days: 14,
      displayedLineWonById: { "m-short": 2_400_000 },
      isKo: true,
    }),
    undefined,
  );
});

test("수량이 있으면 상한도 수량에 비례한다", () => {
  const notice = buildPartialRateNotice({
    portfolio: [MONTHLY_ONLY],
    days: 14,
    displayedLineWonById: { "m-monthly": 4_666_666 },
    unitsById: { "m-monthly": 2 },
    isKo: true,
  });
  assert.equal(notice?.maxBillableWon, 10_000_000);
});

test("상한이 표시액보다 낮아지지 않는다", () => {
  // 표시액이 이미 월정가를 넘는 경우(장기·수량) 상한은 표시액이다.
  const notice = buildPartialRateNotice({
    portfolio: [MONTHLY_ONLY],
    days: 14,
    displayedLineWonById: { "m-monthly": 9_000_000 },
    isKo: true,
  });
  assert.equal(notice?.maxBillableWon, 9_000_000);
});

test("영문 문구도 나온다", () => {
  const notice = buildPartialRateNotice({
    portfolio: [MONTHLY_ONLY],
    days: 14,
    displayedLineWonById: { "m-monthly": 2_333_333 },
    isKo: false,
  });
  assert.match(notice!.text, /monthly units only/);
  assert.match(notice!.text, /KRW 5,000,000/);
});

// ── 경고 코드가 광고주 문구로 새지 않는다 ──────────────────────────────────

test("각주에 경고 코드 문자열이 들어가지 않는다", () => {
  const notice = buildPartialRateNotice({
    portfolio: [MONTHLY_ONLY],
    days: 14,
    displayedLineWonById: { "m-monthly": 2_333_333 },
    isKo: true,
  });
  assert.ok(!notice!.text.includes("MEDIA_NO_PARTIAL_RATE_TIER"));
});
