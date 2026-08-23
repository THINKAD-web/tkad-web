/**
 * 가격 미등록(₩0) 매체 — 실사용 회귀 픽스처.
 *
 * PR #453(이슈3) 이후 「전환 캠페인」 보고서에서 발견.
 * 원인: 카탈로그 `price`/`priceOptions` 가 0 — SSOT 경로 변경과 무관
 * (구·신 경로 모두 0). 표시 계층에서 ₩0 금지.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import {
  plannerMediaPeriodLineWon,
  plannerMonthlyPriceWonForMedia,
} from "@/lib/planner/planner-media-quantity";
import { computeRegionSubdivisionReport } from "@/lib/plan-cart-report/region-subdivision";
import { mediaItemToExportRow } from "@/lib/document-media-detail";
import {
  assertNoZeroWonPriceDisplay,
  formatExportBudgetWonLabel,
} from "@/lib/planner-report-export/format-export-money";

/** 프로덕션 카탈로그 스냅샷 (2026-08-23) */
const HANSEO = {
  id: "cmq3wd9aw000504l5lfq1lha8",
  name: "성수동 한서빌딩 외벽광고",
  type: "static",
  location: "서울특별시 성동구 성수동2가",
  region: "seoul",
  regionMain: "seoul",
  regionSub: "seoul_seongsu",
  district: "성동구",
  country: "KR",
  price: 0,
  pricePeriod: "month",
  lat: 37.54,
  lng: 127.05,
  dailyFootTraffic: 48_000,
  sampleImages: [],
} as MediaItem;

const HANSUNG = {
  id: "cmnz9wm17000004kyd4r72mug",
  name: "강남 한승빌딩 외벽 아트월 광고",
  type: "static",
  location: "서울특별시 서초구 강남대로 423",
  region: "seoul",
  regionMain: "seoul",
  regionSub: "seoul_gangnam",
  district: "서초구",
  country: "KR",
  price: 0,
  pricePeriod: "biweekly",
  priceOptions: [
    {
      label: "2주",
      price: 0,
      period: "biweekly",
      description: "아트월 전체 랩핑 기준",
    },
  ],
  lat: 37.5,
  lng: 127.02,
  dailyFootTraffic: 175_000,
  sampleImages: [],
} as MediaItem;

test("카탈로그 데이터 — 구·신 가격 경로 모두 0 (PR #453 회귀 아님)", () => {
  for (const m of [HANSEO, HANSUNG]) {
    const root = catalogPriceFieldToWon(m.price);
    const resolved = plannerMonthlyPriceWonForMedia(m);
    assert.equal(root, 0);
    assert.equal(resolved, 0);
    assert.equal(
      plannerMediaPeriodLineWon(m, { months: 1 }, { quantities: { [m.id]: 1 } }),
      0,
    );
  }
});

test("매체 카드 — 월단가·집행소계 행 없음 (0원 라벨 미생성)", () => {
  const row = mediaItemToExportRow(HANSEO, true, {
    months: 1,
    periodCtx: { months: 1 },
    pricing: { quantities: { [HANSEO.id]: 1 } },
  });
  assert.equal(row.monthlyPriceLabel, undefined);
  assert.equal(row.lineTotalLabel, undefined);
});

test("한승빌딩 — priceOptions 0원·수량 2주만 표시", () => {
  const row = mediaItemToExportRow(HANSUNG, true, {
    months: 1,
    periodCtx: { months: 1 },
    pricing: {
      quantities: { [HANSUNG.id]: 1 },
      priceOptionIndex: { [HANSUNG.id]: 0 },
    },
  });
  assert.equal(row.monthlyPriceLabel, undefined);
  assert.equal(row.lineTotalLabel, undefined);
  assert.match(row.quantityLabel ?? "", /2주/);
});

test("상권표 — 내부 monthlyBudgetWon 은 0 이지만 표시는 가격 문의", () => {
  const portfolio = [HANSEO, HANSUNG];
  const pricing = {
    quantities: Object.fromEntries(portfolio.map((m) => [m.id, 1])),
    priceOptionIndex: { [HANSUNG.id]: 0 },
  };
  const report = computeRegionSubdivisionReport(portfolio, 1, true, pricing);
  assert.ok(report);
  const seongsu = report!.breakdown.find((r) => r.label.includes("성수"));
  const gangnam = report!.breakdown.find((r) => r.label.includes("강남"));
  assert.ok(seongsu);
  assert.ok(gangnam);
  assert.equal(seongsu!.monthlyBudgetWon, 0);
  assert.equal(gangnam!.monthlyBudgetWon, 0);

  for (const row of report!.breakdown) {
    const label = formatExportBudgetWonLabel(row.monthlyBudgetWon, true);
    assert.ok(
      assertNoZeroWonPriceDisplay(label),
      `₩0 표기 금지: ${row.label} → ${label}`,
    );
  }
});

test("formatExportBudgetWonLabel — 양수는 ₩, 0 이하는 가격 문의", () => {
  assert.equal(formatExportBudgetWonLabel(1_000_000, true), "₩1,000,000");
  assert.equal(formatExportBudgetWonLabel(0, true), "가격 문의");
  assert.equal(formatExportBudgetWonLabel(-1, true), "가격 문의");
  assert.ok(assertNoZeroWonPriceDisplay(formatExportBudgetWonLabel(0, true)));
});
