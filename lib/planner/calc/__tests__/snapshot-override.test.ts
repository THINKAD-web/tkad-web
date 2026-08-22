/**
 * A-1b Wave 3 — `itemImpressions` 오버라이드 (저장 스냅샷 재현).
 *
 * 방식 1 — 화면에 표시하는 값 자체가 저장 스냅샷이어야 한다.
 * 엔진을 우회하는 것이 아니라, 저장된 라인값을 엔진에 넣어 **집계만** 시킨다.
 * `itemNet`(금액)이 이미 그렇게 동작하므로 노출도 대칭으로 맞춘다.
 *
 * 핵심 제약 — override 시 세 값의 앵커가 monthly → campaign 으로 뒤집히고,
 * monthly 를 다시 반올림하면 `MEDIA_RATIO_LOCK` 이 깨진다. 저장값이 일수로
 * 나누어떨어지지 않는 경우가 그 지점이라 양쪽을 모두 검사한다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { calculatePlan } from "@/lib/planner/calc/engine";
import { runValidation } from "@/lib/planner/calc/validate";
import { PLAN_DAYS_PER_MONTH } from "@/lib/planner/calc/types";

function media(o: Partial<MediaItem> & Pick<MediaItem, "id">): MediaItem {
  return {
    name: o.id,
    nameEn: o.id,
    location: "서울특별시",
    locationEn: "Seoul",
    region: "seoul",
    type: "digital",
    price: 0,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 0,
    description: "",
    descriptionEn: "",
    images: [],
    ...o,
  } as MediaItem;
}

const M1 = media({
  id: "m1",
  name: "맥스비전",
  dailyFootTraffic: 165_000,
  district: "관악구",
  regionMain: "seoul",
  regionSub: "seoul_gangnam",
  type: "digital",
});
const M2 = media({
  id: "m2",
  name: "이마트24 네트워크",
  dailyFootTraffic: 35_000,
  district: "구로구",
  regionMain: "seoul",
  regionSub: "seoul_guro",
  type: "static",
});

const DAYS = 21;

/** 저장 스냅샷의 라인 노출 — 21일로 나누어떨어진다 */
const EVEN_1 = 165_000 * DAYS; //  3,465,000
const EVEN_2 = 35_000 * 50 * DAYS; // 36,750,000

function planWithOverride(
  i1: number,
  i2: number,
  days = DAYS,
) {
  return calculatePlan({
    media: [
      { media: M1, itemNet: 4_000_000, itemImpressions: i1 },
      { media: M2, itemNet: 3_000_000, itemImpressions: i2 },
    ],
    period: { kind: "days", days },
    budgetWon: 7_000_000,
  });
}

// ── 저장값이 그대로 표시되는가 ─────────────────────────────────────────────

test("override 한 라인 노출이 그대로 campaignImpressions 가 된다", () => {
  const plan = planWithOverride(EVEN_1, EVEN_2);
  const m1 = plan.mediaItems.find((m) => m.id === "m1")!;
  const m2 = plan.mediaItems.find((m) => m.id === "m2")!;

  assert.equal(m1.campaignImpressions, EVEN_1);
  assert.equal(m2.campaignImpressions, EVEN_2);
});

test("override 합계가 저장 스냅샷 총노출과 일치한다", () => {
  const storedTotal = EVEN_1 + EVEN_2;
  const plan = planWithOverride(EVEN_1, EVEN_2);
  assert.equal(plan.impressions.campaignTotal, storedTotal);
});

test("override 시 basis 가 snapshot 으로 기록된다", () => {
  const plan = planWithOverride(EVEN_1, EVEN_2);
  for (const m of plan.mediaItems) {
    assert.equal(m.impressionsBasis, "snapshot");
  }
});

test("override 없으면 기존 유동인구 경로를 그대로 쓴다", () => {
  const plan = calculatePlan({
    media: [{ media: M1, itemNet: 4_000_000 }],
    period: { kind: "days", days: DAYS },
    budgetWon: 4_000_000,
  });
  const m1 = plan.mediaItems[0]!;
  assert.equal(m1.impressionsBasis, "dailyDerived");
  assert.equal(m1.campaignImpressions, 165_000 * DAYS);
});

// ── MEDIA_RATIO_LOCK — 양쪽 케이스 ─────────────────────────────────────────

test("MEDIA_RATIO_LOCK — 저장값이 일수로 나누어떨어질 때 통과한다", () => {
  const plan = planWithOverride(EVEN_1, EVEN_2);
  const report = runValidation(plan);
  assert.equal(
    report.issues.filter((i) => i.check === "MEDIA_RATIO_LOCK").length,
    0,
    JSON.stringify(report.issues.filter((i) => i.check === "MEDIA_RATIO_LOCK")),
  );
});

test("MEDIA_RATIO_LOCK — 저장값이 나누어떨어지지 않아도 통과한다", () => {
  // 21 로 나누어떨어지지 않는 값. monthly 를 재반올림하면 여기서 깨진다.
  const ODD_1 = 1_000_001;
  const ODD_2 = 3_333_337;
  const plan = planWithOverride(ODD_1, ODD_2);

  const report = runValidation(plan);
  const issues = report.issues.filter((i) => i.check === "MEDIA_RATIO_LOCK");
  assert.equal(issues.length, 0, JSON.stringify(issues));

  // 저장값은 여전히 그대로여야 한다
  assert.equal(plan.impressions.campaignTotal, ODD_1 + ODD_2);
});

test("MEDIA_RATIO_LOCK — 여러 기간에서 나누어떨어지지 않는 값을 견딘다", () => {
  for (const days of [7, 14, 21, 30, 45, 365]) {
    for (const stored of [1, 999_983, 1_000_001, 42_105_001]) {
      const plan = planWithOverride(stored, stored + 7, days);
      const issues = runValidation(plan).issues.filter(
        (i) => i.check === "MEDIA_RATIO_LOCK",
      );
      assert.equal(
        issues.length,
        0,
        `days=${days} stored=${stored} — ${JSON.stringify(issues)}`,
      );
    }
  }
});

test("TOTAL_RATIO_LOCK 도 override 경로에서 통과한다", () => {
  const plan = planWithOverride(1_000_001, 3_333_337);
  const issues = runValidation(plan).issues.filter(
    (i) => i.check === "TOTAL_RATIO_LOCK",
  );
  assert.equal(issues.length, 0, JSON.stringify(issues));
});

// ── 비례 관계 — daily·monthly·campaign ─────────────────────────────────────

test("daily × days == campaign, daily × 30 == monthly 가 유지된다", () => {
  const stored = 1_000_001;
  const plan = planWithOverride(stored, stored);
  const m1 = plan.mediaItems[0]!;

  assert.equal(m1.dailyImpressions, stored / DAYS);
  assert.equal(m1.monthlyImpressions, (stored / DAYS) * PLAN_DAYS_PER_MONTH);
  assert.equal(Math.round(m1.dailyImpressions * DAYS), m1.campaignImpressions);
});

test("daily·monthly·campaign 정렬 순서가 override 경로에서도 같다", () => {
  const plan = planWithOverride(EVEN_1, EVEN_2);
  const ids = (rows: typeof plan.mediaItems) => rows.map((r) => r.id);
  const byDaily = [...plan.mediaItems].sort(
    (a, b) => b.dailyImpressions - a.dailyImpressions,
  );
  const byMonthly = [...plan.mediaItems].sort(
    (a, b) => b.monthlyImpressions - a.monthlyImpressions,
  );
  const byCampaign = [...plan.mediaItems].sort(
    (a, b) => b.campaignImpressions - a.campaignImpressions,
  );
  const byShare = [...plan.mediaItems].sort(
    (a, b) => b.impressionShare - a.impressionShare,
  );

  assert.deepEqual(ids(byDaily), ids(byMonthly));
  assert.deepEqual(ids(byDaily), ids(byCampaign));
  assert.deepEqual(ids(byDaily), ids(byShare));
});

test("SHARE_ORDER_LOCK 이 override 경로에서 통과한다", () => {
  const plan = planWithOverride(EVEN_1, EVEN_2);
  const issues = runValidation(plan).issues.filter(
    (i) => i.check === "SHARE_ORDER_LOCK",
  );
  assert.equal(issues.length, 0, JSON.stringify(issues));
});

// ── 집계가 저장값 위에서 닫히는가 ──────────────────────────────────────────

test("유형별·지역별 집계 합이 저장 총계와 닫힌다", () => {
  const storedTotal = EVEN_1 + EVEN_2;
  const plan = planWithOverride(EVEN_1, EVEN_2);

  for (const rows of [
    plan.breakdown.byCategory,
    plan.breakdown.byBrowseCategory,
    plan.breakdown.byRegion,
    plan.breakdown.byRegionSub,
  ]) {
    const sum = rows.reduce((s, r) => s + r.impressions, 0);
    assert.equal(sum, storedTotal);
  }
});

// ── 경계 ───────────────────────────────────────────────────────────────────

test("override 0 은 0 으로 집계된다", () => {
  const plan = planWithOverride(0, EVEN_2);
  const m1 = plan.mediaItems.find((m) => m.id === "m1")!;
  assert.equal(m1.campaignImpressions, 0);
  assert.equal(m1.dailyImpressions, 0);
  assert.equal(plan.impressions.campaignTotal, EVEN_2);
});

test("override 경로에서는 기준 충돌 경고를 내지 않는다", () => {
  // impressions 가 유동인구 환산과 어긋나는 매체 — 기본 경로면 경고 대상이다.
  const conflicted = media({
    id: "c",
    dailyFootTraffic: 165_000,
    impressions: 9_000_000,
    type: "digital",
  });

  const withOverride = calculatePlan({
    media: [{ media: conflicted, itemNet: 1, itemImpressions: 3_465_000 }],
    period: { kind: "days", days: DAYS },
    budgetWon: 1,
  });
  assert.equal(
    withOverride.warnings.filter(
      (w) => w.code === "IMPRESSIONS_BASIS_CONFLICT",
    ).length,
    0,
    "저장값을 쓰는 경로에서는 유도값과의 충돌이 성립하지 않는다",
  );

  // 기본 경로에서는 여전히 경고한다 (회귀 방지)
  const withoutOverride = calculatePlan({
    media: [{ media: conflicted, itemNet: 1 }],
    period: { kind: "days", days: DAYS },
    budgetWon: 1,
  });
  assert.ok(
    withoutOverride.warnings.some(
      (w) => w.code === "IMPRESSIONS_BASIS_CONFLICT",
    ),
  );
});
