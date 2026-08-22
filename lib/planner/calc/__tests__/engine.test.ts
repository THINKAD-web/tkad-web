import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { calculatePlan } from "@/lib/planner/calc/engine";
import { PLAN_DAYS_PER_MONTH } from "@/lib/planner/calc/types";

function media(overrides: Partial<MediaItem> & Pick<MediaItem, "id">): MediaItem {
  return {
    name: overrides.id,
    nameEn: overrides.id,
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
    ...overrides,
  } as MediaItem;
}

/**
 * 「고려 캠페인」 회귀 케이스 — 매체 3개 · 21일 · 예산 700만.
 * 일 유동인구 합 242,000 × 21일 = 5,082,000.
 */
const KOREA_CAMPAIGN = [
  media({
    id: "m1",
    name: "서울대입구역 맥스비전",
    dailyFootTraffic: 165_000,
    district: "관악구",
    city: "서울",
    regionZone: "gwanak",
    type: "digital",
  }),
  media({
    id: "m2",
    name: "강남대로 빌보드",
    dailyFootTraffic: 52_000,
    district: "강남구",
    city: "서울",
    regionZone: "gangnam",
    regionMain: "seoul",
    regionSub: "seoul_gangnam",
    type: "static",
  }),
  media({
    id: "m3",
    name: "홍대 버스 래핑",
    dailyFootTraffic: 25_000,
    district: "마포구",
    city: "서울",
    regionZone: "mapo",
    regionMain: "seoul",
    regionSub: "seoul_hongdae",
    type: "mobile",
  }),
];

function koreaCampaignPlan() {
  return calculatePlan({
    media: [
      { media: KOREA_CAMPAIGN[0]!, itemNet: 4_000_000 },
      { media: KOREA_CAMPAIGN[1]!, itemNet: 2_000_000 },
      { media: KOREA_CAMPAIGN[2]!, itemNet: 1_000_000 },
    ],
    period: { kind: "days", days: 21 },
    budgetWon: 7_000_000,
    now: new Date("2026-08-21T00:00:00Z"),
  });
}

test("21일 캠페인이 1개월로 반올림되지 않는다", () => {
  const plan = koreaCampaignPlan();
  assert.equal(plan.period.days, 21);
  assert.equal(plan.period.monthsEquivalent, 21 / PLAN_DAYS_PER_MONTH);
  // 기존 Math.max(1, months) 클램프였다면 30일치가 나왔다.
  assert.notEqual(plan.period.days, PLAN_DAYS_PER_MONTH);
});

test("총 노출이 일 유동인구 × 일수와 일치한다", () => {
  const plan = koreaCampaignPlan();
  assert.equal(plan.impressions.daily, 242_000);
  assert.equal(plan.impressions.campaignTotal, 5_082_000);
  assert.equal(
    plan.impressions.monthlyEquivalent,
    242_000 * PLAN_DAYS_PER_MONTH,
  );
});

test("매체 노출 합계가 포트폴리오 총 노출과 어긋나지 않는다", () => {
  const plan = koreaCampaignPlan();
  const sum = plan.mediaItems.reduce((s, m) => s + m.campaignImpressions, 0);
  assert.equal(sum, plan.impressions.campaignTotal);
});

test("daily·monthly·campaign 정렬 순서가 모두 같다", () => {
  const plan = koreaCampaignPlan();
  const byDaily = [...plan.mediaItems].sort(
    (a, b) => b.dailyImpressions - a.dailyImpressions,
  );
  const byMonthly = [...plan.mediaItems].sort(
    (a, b) => b.monthlyImpressions - a.monthlyImpressions,
  );
  const byShare = [...plan.mediaItems].sort(
    (a, b) => b.impressionShare - a.impressionShare,
  );
  const ids = (rows: typeof plan.mediaItems) => rows.map((r) => r.id);
  assert.deepEqual(ids(byDaily), ids(byMonthly));
  assert.deepEqual(ids(byDaily), ids(byShare));
});

test("금액은 입력 itemNet 합계 그대로다 (엔진이 기간 환산하지 않는다)", () => {
  const plan = koreaCampaignPlan();
  assert.equal(plan.money.mediaNet, 7_000_000);
  assert.equal(plan.budgetUsage.usedWon, 7_000_000);
  assert.equal(plan.budgetUsage.usagePct, 100);
  assert.equal(plan.budgetUsage.status, "fit");
});

test("21일은 운영 요율 구간과 맞지 않아 경고를 남긴다", () => {
  const plan = koreaCampaignPlan();
  assert.equal(plan.period.exactRateKey, null);
  const w = plan.warnings.find((x) => x.code === "PERIOD_NO_EXACT_RATE_KEY");
  assert.ok(w, "PERIOD_NO_EXACT_RATE_KEY 경고가 있어야 한다");
  assert.equal(w.context?.days, 21);
});

test("30일은 요율 구간과 정확히 일치해 경고가 없다", () => {
  const plan = calculatePlan({
    media: [{ media: KOREA_CAMPAIGN[0]!, itemNet: 4_000_000 }],
    period: { kind: "days", days: 30 },
    budgetWon: 4_000_000,
  });
  assert.equal(plan.period.exactRateKey, "30days");
  assert.equal(
    plan.warnings.filter((w) => w.code === "PERIOD_NO_EXACT_RATE_KEY").length,
    0,
  );
});

test("2주 프리셋(14일)은 15days 구간을 타지 못해 경고가 뜬다 — A-6 확인 대상", () => {
  const plan = calculatePlan({
    media: [{ media: KOREA_CAMPAIGN[0]!, itemNet: 4_000_000 }],
    period: { kind: "months", months: 14 / 30 },
    budgetWon: 4_000_000,
  });
  assert.equal(plan.period.days, 14);
  assert.equal(plan.period.exactRateKey, null);
  assert.ok(
    plan.warnings.some((w) => w.code === "PERIOD_NO_EXACT_RATE_KEY"),
  );
});

test("flight 날짜는 양끝 포함 일수로 환산된다", () => {
  const plan = calculatePlan({
    media: [{ media: KOREA_CAMPAIGN[0]!, itemNet: 1 }],
    period: {
      kind: "flight",
      startDate: "2026-09-01",
      endDate: "2026-09-21",
    },
    budgetWon: 1,
  });
  assert.equal(plan.period.days, 21);
  assert.equal(plan.period.startDate, "2026-09-01");
  assert.equal(plan.period.endDate, "2026-09-21");
});

test("비중 합계가 100% 근처로 닫힌다", () => {
  const plan = koreaCampaignPlan();
  const impSum = plan.mediaItems.reduce((s, m) => s + m.impressionShare, 0);
  const budSum = plan.mediaItems.reduce((s, m) => s + m.budgetShare, 0);
  assert.ok(Math.abs(impSum - 100) < 0.5, `노출 비중 합 ${impSum}`);
  assert.ok(Math.abs(budSum - 100) < 0.5, `예산 비중 합 ${budSum}`);
});

test("집계 표에는 도달 열이 없다 (C안)", () => {
  const plan = koreaCampaignPlan();
  for (const row of [
    ...plan.breakdown.byCategory,
    ...plan.breakdown.byRegion,
    ...plan.breakdown.byRegionSub,
  ]) {
    assert.equal("uniqueReach" in row, false);
    assert.equal("reach" in row, false);
  }
});

test("도달은 포트폴리오 전체 단위에서만 산출된다", () => {
  const plan = koreaCampaignPlan();
  assert.equal(plan.reach.status, "modeled");
  assert.ok(plan.reach.value != null && plan.reach.value > 0);
  assert.equal(plan.reach.model, "saturation");
});

test("유형별 집계가 카탈로그 3종으로 나뉜다", () => {
  const plan = koreaCampaignPlan();
  const keys = plan.breakdown.byCategory.map((r) => r.key).sort();
  assert.deepEqual(keys, ["digital", "mobile", "static"]);
  for (const row of plan.breakdown.byCategory) {
    assert.equal(row.mediaCount, 1);
  }
});

test("저장된 세부 구역이 없으면 추정값을 쓰고 mapped=false 로 표시한다", () => {
  const plan = koreaCampaignPlan();
  const m1 = plan.mediaItems.find((m) => m.id === "m1")!;
  assert.equal(m1.region.mapped, false);
  assert.ok(
    plan.warnings.some(
      (w) => w.code === "REGION_SUB_UNMAPPED" && w.mediaId === "m1",
    ),
    "관악 매체는 세부 구역 추정 경고를 남겨야 한다",
  );

  const m2 = plan.mediaItems.find((m) => m.id === "m2")!;
  assert.equal(m2.region.mapped, true);
  assert.equal(m2.region.subId, "seoul_gangnam");
});

test("알 수 없는 매체 유형은 null 로 두고 경고한다", () => {
  const plan = calculatePlan({
    media: [
      { media: media({ id: "x", type: "banner", dailyFootTraffic: 100 }), itemNet: 1 },
    ],
    period: { kind: "days", days: 30 },
    budgetWon: 1,
  });
  assert.equal(plan.mediaItems[0]!.type, null);
  assert.equal(plan.mediaItems[0]!.rawType, "banner");
  assert.ok(plan.warnings.some((w) => w.code === "MEDIA_TYPE_UNKNOWN"));
});

test("impressions 와 일 유동인구 환산값이 어긋나면 경고하되 값은 A안 기준을 유지한다", () => {
  const conflicted = media({
    id: "conflict",
    dailyFootTraffic: 165_000,
    // 165,000 × 30 = 4,950,000 이어야 하나 저장값이 다르다
    impressions: 9_000_000,
    type: "digital",
  });

  const plan = calculatePlan({
    media: [{ media: conflicted, itemNet: 4_000_000 }],
    period: { kind: "days", days: 30 },
    budgetWon: 4_000_000,
  });

  const w = plan.warnings.find((x) => x.code === "IMPRESSIONS_BASIS_CONFLICT");
  assert.ok(w, "IMPRESSIONS_BASIS_CONFLICT 경고가 있어야 한다");
  assert.equal(w.mediaId, "conflict");
  assert.equal(w.context?.stored, 9_000_000);
  assert.equal(w.context?.derived, 4_950_000);

  // A안 — impressions 를 무시하고 유동인구 기준을 쓴다.
  assert.equal(plan.mediaItems[0]!.impressionsBasis, "dailyDerived");
  assert.equal(plan.impressions.monthlyEquivalent, 4_950_000);
  assert.equal(plan.impressions.campaignTotal, 4_950_000);
  assert.equal(plan.money.mediaNet, 4_000_000);
  assert.equal(plan.cpm.campaignWon, Math.round(4_000_000 / (4_950_000 / 1000)));
});

test("일 유동인구와 impressions 가 일치하면 충돌 경고가 없다", () => {
  const consistent = media({
    id: "ok",
    dailyFootTraffic: 100_000,
    impressions: 3_000_000,
  });
  const plan = calculatePlan({
    media: [{ media: consistent, itemNet: 1_000_000 }],
    period: { kind: "days", days: 30 },
    budgetWon: 1_000_000,
  });
  assert.equal(
    plan.warnings.filter((w) => w.code === "IMPRESSIONS_BASIS_CONFLICT").length,
    0,
  );
});

test("빈 포트폴리오도 안전하게 계산된다", () => {
  const plan = calculatePlan({
    media: [],
    period: { kind: "days", days: 30 },
    budgetWon: 1_000_000,
  });
  assert.equal(plan.meta.mediaCount, 0);
  assert.equal(plan.impressions.campaignTotal, 0);
  assert.equal(plan.money.mediaNet, 0);
  assert.equal(plan.cpm.campaignWon, null);
  assert.equal(plan.reach.status, "estimating");
  assert.equal(plan.reach.value, null);
});
