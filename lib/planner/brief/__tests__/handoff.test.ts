import assert from "node:assert/strict";
import test from "node:test";

import {
  briefAgeBandsFromKeys,
  briefGoalFromRawGoal,
  briefIndustryFromKey,
  planCartToBriefHandoff,
  resolveBriefHandoff,
  resolveHandoffMix,
  savedPlannerPlanToBriefHandoff,
} from "@/lib/planner/brief/handoff";
import type { MediaItem } from "@/lib/media-data";
import type { PlanCart } from "@/lib/plan-cart";

function media(id: string): MediaItem {
  return {
    id,
    name: id,
    nameEn: id,
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    regionMain: "seoul",
    type: "digital",
    price: 1_000_000,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 10_000,
    sampleImages: [],
  } as unknown as MediaItem;
}

const CATALOG = [media("a"), media("b"), media("c")];

// ── 우선순위 ───────────────────────────────────────────────

test("plan 이 있으면 다른 인계 파라미터를 덮지 않는다", () => {
  const h = resolveBriefHandoff({ plan: "p1", addMedia: "a", brief: "강남" });
  assert.deepEqual(h, { kind: "savedPlan", planId: "p1" });
});

test("loadPlan 은 from/brief/매체보다 우선한다", () => {
  const h = resolveBriefHandoff({
    loadPlan: "lp1",
    from: "plan",
    brief: "강남",
    addMedia: "a",
  });
  assert.deepEqual(h, { kind: "loadPlan", planId: "lp1" });
});

test("from=plan 은 brief·매체보다 우선한다", () => {
  const h = resolveBriefHandoff({ from: "plan", brief: "강남", mediaIds: "a" });
  assert.deepEqual(h, { kind: "planCart" });
});

test("brief 는 매체 파라미터보다 우선한다 (구 클라이언트와 동일)", () => {
  const h = resolveBriefHandoff({ brief: "강남 3000만원", addMedia: "a" });
  assert.deepEqual(h, { kind: "brief", raw: "강남 3000만원" });
});

test("mediaIds 는 쉼표로 나뉘고 addMedia 보다 우선한다", () => {
  const h = resolveBriefHandoff({ mediaIds: "a, b ,,c", addMedia: "z" });
  assert.deepEqual(h, { kind: "media", mediaIds: ["a", "b", "c"], units: null });
});

test("addMedia 는 units 를 함께 싣는다", () => {
  const h = resolveBriefHandoff({ addMedia: "a", units: "4" });
  assert.deepEqual(h, { kind: "media", mediaIds: ["a"], units: 4 });
});

test("빈 쿼리·공백·잘못된 units 는 안전하게 처리한다", () => {
  assert.equal(resolveBriefHandoff({}), null);
  assert.equal(resolveBriefHandoff({ addMedia: "   " }), null);
  const h = resolveBriefHandoff({ addMedia: "a", units: "0" });
  assert.deepEqual(h, { kind: "media", mediaIds: ["a"], units: null });
});

// ── 매체 검증 ──────────────────────────────────────────────

test("카탈로그에 없는 매체는 missing 으로 분리한다", () => {
  const r = resolveHandoffMix({
    catalog: CATALOG,
    mediaIds: ["a", "zzz", "b"],
    units: null,
  });
  assert.deepEqual(r.lines, [
    { mediaId: "a", units: 1 },
    { mediaId: "b", units: 1 },
  ]);
  assert.deepEqual(r.missing, ["zzz"]);
});

test("units 는 단일 매체일 때만 적용한다 (구 동작 유지)", () => {
  const one = resolveHandoffMix({ catalog: CATALOG, mediaIds: ["a"], units: 7 });
  assert.deepEqual(one.lines, [{ mediaId: "a", units: 7 }]);

  const many = resolveHandoffMix({
    catalog: CATALOG,
    mediaIds: ["a", "b"],
    units: 7,
  });
  assert.deepEqual(many.lines, [
    { mediaId: "a", units: 1 },
    { mediaId: "b", units: 1 },
  ]);
});

test("중복 매체 id 는 한 번만 담는다", () => {
  const r = resolveHandoffMix({
    catalog: CATALOG,
    mediaIds: ["a", "a", "b"],
    units: null,
  });
  assert.equal(r.lines.length, 2);
});

// ── 매핑 ──────────────────────────────────────────────────

test("업종 키 매핑", () => {
  assert.equal(briefIndustryFromKey("indFb"), "fb");
  assert.equal(briefIndustryFromKey("indFinance"), "finance");
  assert.equal(briefIndustryFromKey("unknown"), null);
  assert.equal(briefIndustryFromKey(null), null);
});

test("연령 키 매핑 — ageAll 은 전 연령이므로 비운다", () => {
  assert.deepEqual(briefAgeBandsFromKeys(["age20s", "age30s"]), ["20s", "30s"]);
  assert.deepEqual(briefAgeBandsFromKeys(["ageAll"]), []);
  assert.deepEqual(briefAgeBandsFromKeys(undefined), []);
});

test("알 수 없는 목표는 awareness 로 단정하지 않는다", () => {
  assert.equal(briefGoalFromRawGoal("brand"), "awareness");
  assert.equal(briefGoalFromRawGoal("완전히 모르는 값"), null);
  assert.equal(briefGoalFromRawGoal(null), null);
});

// ── 내 플랜 카트 ───────────────────────────────────────────

test("플랜 카트 → 브리프 + 믹스", () => {
  const cart: PlanCart = {
    items: [
      { mediaId: "a", mediaName: "A", mediaType: "digital", region: "seoul", price: 1, quantity: 3 },
      { mediaId: "gone", mediaName: "X", mediaType: "digital", region: "seoul", price: 1 },
    ],
    totalBudget: 20_000_000,
    duration: 2,
    campaignGoal: "brand",
    industryKey: "indRetail",
    updatedAt: "",
  } as unknown as PlanCart;

  const { patch, mix } = planCartToBriefHandoff(cart, CATALOG);
  assert.equal(patch.budgetInputWon, 20_000_000);
  assert.equal(patch.budgetMode, "monthly");
  assert.equal(patch.goal, "awareness");
  assert.equal(patch.industry, "retail");
  assert.ok(patch.flightStart && patch.flightEnd, "기간(개월)이 날짜로 환산된다");
  assert.deepEqual(mix.missing, ["gone"]);
  assert.equal(mix.lines.length, 1);
  assert.equal(mix.lines[0]!.mediaId, "a");
});

// ── 구 저장 플랜 ───────────────────────────────────────────

test("구 SavedPlannerPlan → 브리프 + 믹스", () => {
  const { patch, mix } = savedPlannerPlanToBriefHandoff(
    {
      budget: "3000",
      months: 1,
      campaignGoal: "brand",
      industryKey: "indTech",
      ageKeys: ["age30s"],
      regions: ["seoul"],
      campaignMediaIds: ["a", "b", "missing-one"],
      campaignMediaQuantities: { a: 5 },
    },
    CATALOG,
  );

  // 구 플래너 budget 은 만원 단위 월예산
  assert.equal(patch.budgetInputWon, 30_000_000);
  assert.equal(patch.budgetMode, "monthly");
  assert.equal(patch.industry, "tech");
  assert.deepEqual(patch.ageBands, ["30s"]);
  assert.deepEqual(patch.regionCodes, ["11"]);
  assert.deepEqual(mix.missing, ["missing-one"]);
  assert.deepEqual(mix.lines, [
    { mediaId: "a", units: 5 },
    { mediaId: "b", units: 1 },
  ]);
});

test("빈 저장 플랜도 예외 없이 처리한다", () => {
  const { patch, mix } = savedPlannerPlanToBriefHandoff({}, CATALOG);
  assert.deepEqual(mix.lines, []);
  assert.deepEqual(mix.missing, []);
  assert.equal(patch.budgetInputWon, undefined);
});
