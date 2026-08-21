import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { calculatePlan } from "@/lib/planner/calc/engine";
import { runValidation } from "@/lib/planner/calc/validate";
import type { PlanResult } from "@/lib/planner/calc/types";

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

/** 지역·유형이 모두 매핑된 정상 플랜 — 커버리지 100% */
function healthyPlan(): PlanResult {
  return calculatePlan({
    media: [
      {
        media: media({
          id: "m1",
          dailyFootTraffic: 165_000,
          regionZone: "gangnam",
          regionMain: "seoul",
          regionSub: "seoul_gangnam",
          mediaMainCategory: "billboard",
          type: "digital",
        }),
        itemNet: 4_000_000,
      },
      {
        media: media({
          id: "m2",
          dailyFootTraffic: 52_000,
          regionZone: "mapo",
          regionMain: "seoul",
          regionSub: "seoul_hongdae",
          mediaMainCategory: "billboard",
          type: "static",
        }),
        itemNet: 2_000_000,
      },
      {
        media: media({
          id: "m3",
          dailyFootTraffic: 25_000,
          regionZone: "downtown",
          regionMain: "seoul",
          regionSub: "seoul_cbd",
          mediaMainCategory: "billboard",
          type: "mobile",
        }),
        itemNet: 1_000_000,
      },
    ],
    period: { kind: "days", days: 21 },
    budgetWon: 7_000_000,
    now: new Date("2026-08-21T00:00:00Z"),
  });
}

/** 구조적 공유를 피해 깊은 복사 후 조작 */
function corrupt(mutate: (p: PlanResult) => void): PlanResult {
  const p = structuredClone(healthyPlan());
  mutate(p);
  return p;
}

// ── 정상 케이스 ─────────────────────────────────────────────────────────────

test("정상 플랜은 ok === true, issues 비어 있음", () => {
  const report = runValidation(healthyPlan());
  assert.deepEqual(report.issues, []);
  assert.equal(report.ok, true);
});

test("정상 플랜은 커버리지 4종 모두 100%", () => {
  const report = runValidation(healthyPlan());
  assert.equal(report.coverage.category, 100);
  assert.equal(report.coverage.browseCategory, 100);
  assert.equal(report.coverage.region, 100);
  assert.equal(report.coverage.regionSub, 100);
});

test("21일 플랜도 정합성 검사를 통과한다", () => {
  const plan = healthyPlan();
  assert.equal(plan.period.days, 21);
  assert.equal(runValidation(plan).ok, true);
});

// ── 합계 정합성 ─────────────────────────────────────────────────────────────

test("MEDIA_NET_SUM — 합계를 조작하면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.money.mediaNet += 500_000;
    }),
  );
  assert.equal(report.ok, false);
  const issue = report.issues.find((i) => i.check === "MEDIA_NET_SUM");
  assert.ok(issue);
  assert.equal(issue.delta, 500_000);
});

test("IMPRESSION_SUM — 총 노출을 조작하면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.impressions.campaignTotal += 1_000;
    }),
  );
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => i.check === "IMPRESSION_SUM"));
});

test("BUDGET_USAGE_SUM — 소진액이 순액과 다르면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.budgetUsage.usedWon = 1;
    }),
  );
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => i.check === "BUDGET_USAGE_SUM"));
});

// ── 비중 ────────────────────────────────────────────────────────────────────

test("MEDIA_SHARE_CLOSURE — 비중 합이 100 에서 벗어나면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.mediaItems[0]!.impressionShare += 5;
    }),
  );
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => i.check === "MEDIA_SHARE_CLOSURE"));
});

test("MEDIA_SHARE_CLOSURE — 반올림 오차 0.3%p 는 통과시킨다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.mediaItems[0]!.impressionShare += 0.3;
    }),
  );
  assert.equal(report.ok, true);
});

test("BREAKDOWN_SHARE_CLOSURE — 집계 비중을 조작하면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.breakdown.byCategory[0]!.budgetShare += 10;
    }),
  );
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => i.check === "BREAKDOWN_SHARE_CLOSURE"));
});

// ── 파생 비율 ───────────────────────────────────────────────────────────────

test("MEDIA_RATIO_LOCK — daily × 30 != monthly 면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.mediaItems[0]!.monthlyImpressions += 10_000;
    }),
  );
  assert.equal(report.ok, false);
  const issue = report.issues.find((i) => i.check === "MEDIA_RATIO_LOCK");
  assert.ok(issue);
  assert.equal(issue.mediaId, "m1");
});

test("MEDIA_RATIO_LOCK — daily × days != campaign 이면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.mediaItems[0]!.campaignImpressions += 7;
      p.impressions.campaignTotal += 7;
    }),
  );
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => i.check === "MEDIA_RATIO_LOCK"));
});

test("SHARE_ORDER_LOCK — 비중을 뒤집으면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      // m1 이 노출은 가장 많은데 비중을 가장 작게 만든다 (D3 순서 역전 재현)
      const m1 = p.mediaItems.find((m) => m.id === "m1")!;
      const m3 = p.mediaItems.find((m) => m.id === "m3")!;
      const tmp = m1.impressionShare;
      m1.impressionShare = m3.impressionShare;
      m3.impressionShare = tmp;
    }),
  );
  assert.equal(report.ok, false);
  const issue = report.issues.find((i) => i.check === "SHARE_ORDER_LOCK");
  assert.ok(issue);
  assert.equal(issue.mediaId, "m1");
});

test("SHARE_ORDER_LOCK — 반올림 동률은 통과시킨다", () => {
  const report = runValidation(
    corrupt((p) => {
      // 노출은 다르지만 비중이 같은 값으로 반올림된 상황
      p.mediaItems[0]!.impressionShare = p.mediaItems[1]!.impressionShare;
    }),
  );
  assert.equal(
    report.issues.filter((i) => i.check === "SHARE_ORDER_LOCK").length,
    0,
  );
});

// ── 기간 ────────────────────────────────────────────────────────────────────

test("PERIOD_INVARIANT — days 를 30 으로 클램프하면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.period.days = 30; // monthsEquivalent 는 21/30 그대로 → 불일치
    }),
  );
  assert.equal(report.ok, false);
  const issue = report.issues.find((i) => i.check === "PERIOD_INVARIANT");
  assert.ok(issue);
  assert.match(String(issue.message), /clamp/);
});

test("PERIOD_INVARIANT — days 가 0 이면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.period.days = 0;
      p.period.monthsEquivalent = 0;
    }),
  );
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => i.check === "PERIOD_INVARIANT"));
});

// ── 도달 ────────────────────────────────────────────────────────────────────

test("REACH_CONSISTENCY — estimating 인데 값이 있으면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.reach.status = "estimating";
      // value 는 그대로 둔다
    }),
  );
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => i.check === "REACH_CONSISTENCY"));
});

test("REACH_CONSISTENCY — modeled 인데 값이 없으면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.reach.value = null;
    }),
  );
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => i.check === "REACH_CONSISTENCY"));
});

test("빈 포트폴리오는 estimating 상태로 정상 통과한다", () => {
  const plan = calculatePlan({
    media: [],
    period: { kind: "days", days: 30 },
    budgetWon: 1_000_000,
  });
  const report = runValidation(plan);
  assert.equal(plan.reach.status, "estimating");
  assert.equal(report.ok, true);
});

// ── 참조 무결성 ─────────────────────────────────────────────────────────────

test("WARNING_MEDIA_REF — 없는 매체를 가리키면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.warnings.push({
        code: "MEDIA_PRICE_MISSING",
        kind: "data",
        severity: "warn",
        messageKo: "x",
        messageEn: "x",
        mediaId: "ghost",
      });
    }),
  );
  assert.equal(report.ok, false);
  const issue = report.issues.find((i) => i.check === "WARNING_MEDIA_REF");
  assert.ok(issue);
  assert.equal(issue.actual, "ghost");
});

test("WARNING_KIND_MATCH — kind 가 등록표와 어긋나면 잡아낸다", () => {
  const report = runValidation(
    corrupt((p) => {
      p.warnings.push({
        code: "BUDGET_OVER", // 등록표상 "plan"
        kind: "data",
        severity: "warn",
        messageKo: "x",
        messageEn: "x",
      });
    }),
  );
  assert.equal(report.ok, false);
  const issue = report.issues.find((i) => i.check === "WARNING_KIND_MATCH");
  assert.ok(issue);
  assert.equal(issue.expected, "plan");
  assert.equal(issue.actual, "data");
});

// ── 커버리지 ────────────────────────────────────────────────────────────────

test("BREAKDOWN_COVERAGE — 미매핑 매체가 있으면 커버리지가 100 미만", () => {
  const plan = calculatePlan({
    media: [
      {
        media: media({
          id: "mapped",
          dailyFootTraffic: 100_000,
          regionZone: "gangnam",
          regionMain: "seoul",
          regionSub: "seoul_gangnam",
        }),
        itemNet: 1_000_000,
      },
      {
        // 지역 힌트가 전혀 없어 권역을 특정할 수 없는 매체
        media: media({
          id: "unmapped",
          dailyFootTraffic: 100_000,
          region: "",
          location: "",
          city: "",
          district: "",
        }),
        itemNet: 1_000_000,
      },
    ],
    period: { kind: "days", days: 30 },
    budgetWon: 2_000_000,
  });

  const report = runValidation(plan);
  assert.ok(
    report.coverage.region < 100,
    `region coverage ${report.coverage.region} should be under 100`,
  );
  assert.ok(
    report.issues.some((i) => i.check === "BREAKDOWN_COVERAGE"),
    "커버리지 issue 가 기록돼야 한다",
  );
});

test("BREAKDOWN_COVERAGE 는 ok 를 false 로 만들지 않는다", () => {
  const plan = calculatePlan({
    media: [
      {
        media: media({
          id: "unmapped",
          dailyFootTraffic: 100_000,
          region: "",
          location: "",
          city: "",
          district: "",
        }),
        itemNet: 1_000_000,
      },
    ],
    period: { kind: "days", days: 30 },
    budgetWon: 1_000_000,
  });

  const report = runValidation(plan);
  const nonInfo = report.issues.filter((i) => i.check !== "BREAKDOWN_COVERAGE");
  assert.deepEqual(nonInfo, []);
  assert.equal(report.ok, true, "커버리지 부족은 엔진 버그가 아니다");
});

// ── 경고 분류 ───────────────────────────────────────────────────────────────

test("예산 경고는 kind=plan, 데이터 경고는 kind=data", () => {
  const plan = calculatePlan({
    media: [
      {
        media: media({ id: "m1", dailyFootTraffic: 100_000 }),
        itemNet: 5_000_000,
      },
    ],
    period: { kind: "days", days: 30 },
    budgetWon: 1_000_000, // 500% 초과
  });

  const budget = plan.warnings.find((w) => w.code === "BUDGET_OVER");
  assert.ok(budget);
  assert.equal(budget.kind, "plan");

  const dataWarnings = plan.warnings.filter((w) => w.kind === "data");
  assert.ok(dataWarnings.length > 0);
  for (const w of dataWarnings) {
    assert.notEqual(w.code, "BUDGET_OVER");
    assert.notEqual(w.code, "BUDGET_UNDER_UTILIZED");
  }

  assert.equal(runValidation(plan).ok, true);
});

test("REACH_NOT_MODELED 는 severity=info 다 (각주 중복 표시 방지 근거)", () => {
  const plan = calculatePlan({
    media: [{ media: media({ id: "m1", dailyFootTraffic: 0 }), itemNet: 1 }],
    period: { kind: "days", days: 30 },
    budgetWon: 1,
  });
  const w = plan.warnings.find((x) => x.code === "REACH_NOT_MODELED");
  assert.ok(w);
  assert.equal(w.severity, "info");
  assert.equal(w.kind, "data");
});
