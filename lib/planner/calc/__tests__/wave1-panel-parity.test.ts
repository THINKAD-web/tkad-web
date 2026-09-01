/**
 * Wave 1 패리티 — 효과 시뮬레이션 패널이 표시하는 값이 교체 전후로 같은지.
 *
 * 패널은 pricing·quantities 를 받지 않으므로 수량은 항상 1 이고,
 * 예산 도넛도 periodCtx 없이 월정가를 쓰고 있었다. 그래서 엔진으로 갈아끼워도
 * 화면 숫자가 바뀌지 않아야 한다. 그걸 여기서 직접 비교해 못박는다.
 *
 * 구 경로 : computeAdvancedPlannerMetrics + budgetSplitByCategory
 * 신 경로 : calculatePlan
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  budgetSplitByCategory,
  computeAdvancedPlannerMetrics,
} from "@/lib/planner-logic";
import { plannerMonthlyPriceWonForMedia } from "@/lib/planner/planner-media-quantity";
import { calculatePlan } from "@/lib/planner/calc/engine";

function media(o: Partial<MediaItem> & Pick<MediaItem, "id">): MediaItem {
  return {
    name: o.id,
    nameEn: o.id,
    location: "서울특별시",
    locationEn: "Seoul",
    region: "seoul",
    type: "dooh",
    price: 0,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 0,
    sampleImages: [],
    ...o,
  } as MediaItem;
}

const PORTFOLIO: MediaItem[] = [
  media({
    id: "m1",
    type: "dooh",
    price: 4_000_000,
    dailyFootTraffic: 165_000,
    visibilityScore: 82,
    regionZone: "gwanak",
    district: "관악구",
    city: "서울",
  }),
  media({
    id: "m2",
    type: "static",
    price: 2_000_000,
    dailyFootTraffic: 52_000,
    visibilityScore: 64,
    regionZone: "gangnam",
    district: "강남구",
    city: "서울",
  }),
  media({
    id: "m3",
    type: "mobile",
    price: 1_000_000,
    dailyFootTraffic: 25_000,
    visibilityScore: 40,
    regionZone: "mapo",
    district: "마포구",
    city: "서울",
  }),
];

/** 패널이 실제로 넘기는 입력 그대로 */
function newPath(portfolio: MediaItem[], budgetMan: number, months: number) {
  return calculatePlan({
    media: portfolio.map((m) => ({
      media: m,
      itemNet: plannerMonthlyPriceWonForMedia(m),
    })),
    period: { kind: "months", months },
    budgetWon: Math.max(0, budgetMan) * 10_000,
  });
}

const CASES: Array<{ label: string; months: number; budgetMan: number }> = [
  { label: "21일 (0.7개월)", months: 21 / 30, budgetMan: 700 },
  { label: "1개월", months: 1, budgetMan: 700 },
  { label: "3개월", months: 3, budgetMan: 2100 },
  { label: "14일 (2주)", months: 14 / 30, budgetMan: 700 },
];

for (const c of CASES) {
  test(`${c.label} — 총 노출·OTS·도달·빈도·예산 CPM 이 구 경로와 같다`, () => {
    const old = computeAdvancedPlannerMetrics({
      portfolio: PORTFOLIO,
      budgetMan: c.budgetMan,
      months: c.months,
    })!;
    const plan = newPath(PORTFOLIO, c.budgetMan, c.months);

    assert.equal(plan.impressions.campaignTotal, old.totalImpressions, "총 노출");
    assert.equal(plan.impressions.ots, old.totalOts, "OTS");
    assert.equal(plan.reach.value, old.uniqueReach, "추정 도달");
    assert.equal(plan.reach.frequency, old.avgFrequency, "평균 빈도");
    assert.equal(plan.cpm.budgetWon, old.cpmKrw, "예산 기준 CPM");
  });

  test(`${c.label} — 매체별 행이 구 경로와 같다`, () => {
    const old = computeAdvancedPlannerMetrics({
      portfolio: PORTFOLIO,
      budgetMan: c.budgetMan,
      months: c.months,
    })!;
    const plan = newPath(PORTFOLIO, c.budgetMan, c.months);

    assert.equal(plan.mediaItems.length, old.perMedia.length);
    for (const [i, row] of old.perMedia.entries()) {
      const m = plan.mediaItems[i]!;
      assert.equal(m.id, row.id);
      assert.equal(m.rawType, row.type);
      assert.equal(m.campaignImpressions, row.totalImpressions, `${row.id} 노출`);
      assert.equal(m.ots, row.ots, `${row.id} OTS`);
      assert.equal(m.monthlyCpmWon, row.cpmKrw, `${row.id} 월 CPM`);
    }
  });

  test(`${c.label} — 예산 도넛이 구 경로와 같다`, () => {
    // 패널은 periodCtx 없이 budgetSplitByCategory(portfolio) 를 호출하고 있었다.
    const old = budgetSplitByCategory(PORTFOLIO);
    const plan = newPath(PORTFOLIO, c.budgetMan, c.months);

    const oldByKey = new Map(old.map((s) => [s.key, s]));
    assert.equal(plan.breakdown.byCategory.length, old.length);
    for (const slice of plan.breakdown.byCategory) {
      const o = oldByKey.get(slice.key);
      assert.ok(o, `구 경로에 ${slice.key} 없음`);
      assert.equal(slice.budgetAmount, o.value, `${slice.key} 금액`);
      assert.equal(slice.budgetShare, o.pct, `${slice.key} 비중`);
    }
  });
}

test("수량이 1 이면 노출 기준이 구 경로와 동일하다 (Wave 1 이 값 중립인 근거)", () => {
  const plan = newPath(PORTFOLIO, 700, 1);
  for (const m of plan.mediaItems) {
    assert.equal(m.units, 1);
    assert.equal(m.impressionsBasis, "dailyDerived");
  }
});
