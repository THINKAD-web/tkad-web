/**
 * Wave 3 — 매체 카드 순서와 기여도 순서가 어긋나지 않는지.
 *
 * 원래 버그: 카드는 `dailyFootTraffic` 으로, 기여도는
 * `plannerMonthlyImpressionsForMedia`(= impressions/monthlyFootTraffic 우선)로
 * 각각 정렬해 D3 매체 순서가 뒤집혔다.
 *
 * Wave 0 에서 확인했듯 실서비스 DB 에는 `monthlyFootTraffic` 컬럼이 없어
 * 일반 픽스처로는 재현되지 않는다. 그래서 여기서는 **일부러 그 필드를 가진**
 * 픽스처를 만들어 방어가 실제로 작동하는지 확인한다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { computePortfolioContributions } from "@/lib/document-media-detail";
import { calculatePlan } from "@/lib/planner/calc/engine";
import { runValidation } from "@/lib/planner/calc/validate";
import { plannerMonthlyPriceWonForMedia } from "@/lib/planner/planner-media-quantity";

function media(o: Partial<MediaItem> & Pick<MediaItem, "id">): MediaItem {
  return {
    name: o.id,
    nameEn: o.id,
    location: "서울특별시",
    locationEn: "Seoul",
    region: "seoul",
    type: "digital",
    price: 1_000_000,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 0,
    sampleImages: [],
    ...o,
  } as MediaItem;
}

/**
 * 일 유동인구 순위와 월 노출 순위가 **서로 다른** 포트폴리오.
 *   daily 순위 : A > C > B
 *   monthly 순위: A > B > C   ← monthlyFootTraffic 이 daily×30 과 어긋난다
 */
const INVERTED: MediaItem[] = [
  media({ id: "A", dailyFootTraffic: 100_000, monthlyFootTraffic: 3_000_000 }),
  media({ id: "B", dailyFootTraffic: 20_000, monthlyFootTraffic: 2_000_000 }),
  media({ id: "C", dailyFootTraffic: 50_000, monthlyFootTraffic: 600_000 }),
];

test("픽스처가 실제로 순위 역전 조건을 만든다", () => {
  const byDaily = [...INVERTED]
    .sort((a, b) => (b.dailyFootTraffic ?? 0) - (a.dailyFootTraffic ?? 0))
    .map((m) => m.id);
  const byMonthly = [...INVERTED]
    .sort((a, b) => (b.monthlyFootTraffic ?? 0) - (a.monthlyFootTraffic ?? 0))
    .map((m) => m.id);
  assert.deepEqual(byDaily, ["A", "C", "B"]);
  assert.deepEqual(byMonthly, ["A", "B", "C"]);
  assert.notDeepEqual(byDaily, byMonthly, "두 순위가 달라야 의미가 있다");
});

test("기여도 순위가 엔진의 노출 순위와 일치한다", () => {
  const plan = calculatePlan({
    media: INVERTED.map((m) => ({
      media: m,
      itemNet: plannerMonthlyPriceWonForMedia(m),
    })),
    period: { kind: "months", months: 1 },
    budgetWon: 0,
  });
  const contrib = computePortfolioContributions(INVERTED, 1);

  const planOrder = [...plan.mediaItems]
    .sort((a, b) => b.campaignImpressions - a.campaignImpressions)
    .map((m) => m.id);
  const contribOrder = [...INVERTED]
    .sort(
      (a, b) =>
        (contrib.get(b.id)?.exposurePct ?? 0) -
        (contrib.get(a.id)?.exposurePct ?? 0),
    )
    .map((m) => m.id);

  assert.deepEqual(contribOrder, planOrder);
});

test("엔진 안에서는 daily·monthly·campaign 순위가 전부 같다", () => {
  const plan = calculatePlan({
    media: INVERTED.map((m) => ({ media: m, itemNet: 1_000_000 })),
    period: { kind: "months", months: 1 },
    budgetWon: 0,
  });
  const ids = (key: "dailyImpressions" | "monthlyImpressions" | "campaignImpressions") =>
    [...plan.mediaItems].sort((a, b) => b[key] - a[key]).map((m) => m.id);

  assert.deepEqual(ids("dailyImpressions"), ids("monthlyImpressions"));
  assert.deepEqual(ids("dailyImpressions"), ids("campaignImpressions"));
});

test("SHARE_ORDER_LOCK 이 이 포트폴리오에서 통과한다", () => {
  const plan = calculatePlan({
    media: INVERTED.map((m) => ({ media: m, itemNet: 1_000_000 })),
    period: { kind: "months", months: 1 },
    budgetWon: 0,
  });
  const report = runValidation(plan);
  assert.equal(
    report.issues.filter((i) => i.check === "SHARE_ORDER_LOCK").length,
    0,
  );
});

test("기여도 합계가 100% 근처로 닫힌다", () => {
  const contrib = computePortfolioContributions(INVERTED, 1);
  const exp = [...contrib.values()].reduce((s, v) => s + v.exposurePct, 0);
  const bud = [...contrib.values()].reduce((s, v) => s + v.budgetPct, 0);
  assert.ok(Math.abs(exp - 100) <= 1, `노출 기여도 합 ${exp}`);
  assert.ok(Math.abs(bud - 100) <= 1, `예산 기여도 합 ${bud}`);
});

test("21일 캠페인에서도 기여도 순위가 유지된다", () => {
  const contrib = computePortfolioContributions(INVERTED, 21 / 30);
  const order = [...INVERTED]
    .sort(
      (a, b) =>
        (contrib.get(b.id)?.exposurePct ?? 0) -
        (contrib.get(a.id)?.exposurePct ?? 0),
    )
    .map((m) => m.id);
  assert.deepEqual(order, ["A", "B", "C"]);
});
