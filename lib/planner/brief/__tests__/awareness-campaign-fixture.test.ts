/**
 * 「인지 캠페인」 회귀 픽스처 — 매체 5개 · 14일 · F&B · 디지털/고정형 혼합.
 *
 * 「고려 캠페인」(korea-campaign-fixture) 하나만으로는 못 잡은 버그가 배포 후
 * 실사용에서 드러나 추가한다. 두 가지를 의도적으로 다르게 잡았다.
 *
 *   1. **`buildCampaignPlanSnapshot` 을 실제로 통과시킨다.**
 *      기존 픽스처는 `metrics` 를 손으로 적어 넣어, 저장 시점 계산
 *      (`calcMixMetrics` → 접촉률 · SOV · `resolveMediaProductPrice`)이
 *      한 번도 실행되지 않았다. 실사용 제안서는 전부 이 경로로 저장되므로
 *      픽스처가 그 경로를 안 타면 저장값 관련 버그를 구조적으로 못 잡는다.
 *
 *   2. **디지털·고정형을 섞고 14일을 쓴다.** 접촉률×SOV 보정은 유형별로
 *      20배 차이가 나고(아래 SOV 앵커), 14일은 부분기간 요율 6키
 *      (1/3/5/7/15/30일)에 없어 월 상품가가 그대로 남는 경로를 탄다.
 *      기존 픽스처의 21일·3매체 조합은 두 조건을 모두 비껴갔다.
 *
 * ⚠️ 아래 「현행 불일치」 블록은 **버그를 고정한 것이다.** 값이 맞아서가
 * 아니라, 고쳐질 때 어느 숫자가 움직이는지 드러내려고 박아 둔다.
 * 수정 시 이 단언들이 깨지는 것이 정상이며 그때 기대값을 교체한다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { buildCampaignPlanSnapshot } from "@/lib/planner/brief/build-plan-snapshot";
import { buildBriefReportPayload } from "@/lib/planner/brief/brief-report-adapter";
import { calcLineMetrics } from "@/lib/planner/brief/mix-metrics";
import { EMPTY_BRIEF } from "@/lib/planner/brief/types";

function media(o: Partial<MediaItem> & Pick<MediaItem, "id">): MediaItem {
  return {
    name: o.id,
    nameEn: o.id,
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    regionMain: "seoul",
    type: "digital",
    price: 0,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 0,
    sampleImages: [],
    pricePeriod: "month",
    ...o,
  } as MediaItem;
}

const FLIGHT_DAYS = 14;
const FLIGHT_START = "2026-09-01";
const FLIGHT_END = "2026-09-14";
const BUDGET_WON = 30_000_000;

const CATALOG: MediaItem[] = [
  media({
    id: "n1", name: "우남빌딩 전광판", type: "digital",
    price: 5_000_000, dailyFootTraffic: 221_286,
    district: "강남구", regionSub: "seoul_gangnam",
  }),
  media({
    id: "n2", name: "맥스비전", type: "digital",
    price: 5_000_000, dailyFootTraffic: 165_000,
    district: "관악구", regionSub: "seoul_gwanak",
  }),
  media({
    id: "n3", name: "홍대 코너래핑", type: "static",
    price: 1_000_000, dailyFootTraffic: 42_000,
    district: "마포구", regionSub: "seoul_hongdae",
  }),
  media({
    id: "n4", name: "보조매체 A", type: "static",
    price: 1_000_000, dailyFootTraffic: 30_000,
    district: "중구", regionSub: "seoul_myeongdong",
  }),
  media({
    id: "n5", name: "보조매체 B", type: "digital",
    price: 500_000, dailyFootTraffic: 25_000,
    district: "송파구", regionSub: "seoul_jamsil",
  }),
];

/** 월 정가 합 — 500+500+100+100+50만 */
const MONTHLY_LIST_SUM = 12_500_000;
/** 14일 선형 환산 합 — 보고서 매체 라인·예산배분이 쓰는 기준 */
const PRORATED_SUM = 5_833_333;

const brief = {
  ...EMPTY_BRIEF,
  budgetInputWon: BUDGET_WON,
  budgetMode: "total" as const,
  regionCodes: ["11"] as never,
  goal: "awareness" as const,
  industry: "fb" as const,
  flightStart: FLIGHT_START,
  flightEnd: FLIGHT_END,
};

function snapshot() {
  return buildCampaignPlanSnapshot({
    brief,
    catalog: CATALOG,
    mixUnits: Object.fromEntries(CATALOG.map((m) => [m.id, 1])),
  });
}

function payload() {
  return buildBriefReportPayload({
    plan: snapshot(), catalog: CATALOG, isKo: true,
  });
}

function row(p: ReturnType<typeof payload>, name: string) {
  const r = p.portfolio.find((x) => x.name === name);
  assert.ok(r, `${name} 이 포트폴리오에 있어야 한다`);
  return r;
}

// ── 픽스처 자체 건강 검사 (리터럴 앵커) ───────────────────────────────────

test("픽스처 5개 매체가 모두 살아 있다", () => {
  assert.equal(CATALOG.length, 5);
  const s = snapshot();
  assert.equal(s.mediaMix.length, 5);
  assert.equal(s.mediaMix[0]?.days, FLIGHT_DAYS, "14일이어야 한다");
  assert.equal(s.brief.budgetWon, BUDGET_WON);
  assert.equal(payload().portfolio.length, 5);
});

test("디지털·고정형이 모두 포함된다 (유형 편중 방지)", () => {
  const types = CATALOG.map((m) => m.type);
  assert.ok(types.includes("digital"));
  assert.ok(types.includes("static"));
});

/**
 * 이 픽스처의 존재 이유 — 저장 시점 노출 보정률이 유형별로 20배 다르다.
 * 카드가 보여주는 raw 유동인구와 저장 노출의 괴리가 여기서 생긴다.
 */
test("저장 시점 노출 보정률이 유형별로 20배 차이난다 (디지털 1.25% · 고정형 25%)", () => {
  const ratio = (m: MediaItem) => {
    const raw = (m.dailyFootTraffic ?? 0) * FLIGHT_DAYS;
    return calcLineMetrics({ media: m, units: 1 }, FLIGHT_DAYS).impressions.value / raw;
  };
  assert.ok(Math.abs(ratio(CATALOG[0]!) - 0.0125) < 1e-6, "디지털 = 접촉률×SOV");
  assert.ok(Math.abs(ratio(CATALOG[2]!) - 0.25) < 1e-6, "고정형 = 접촉률×SOV");
  assert.equal(Math.round(0.25 / 0.0125), 20);
});

// ── ① 청구 기준 — 표시는 선형 환산으로 통일, 상한은 각주로 명시 ────────────
//
// `metrics.totalCostWon` 은 `resolveMediaProductPrice(media, 14)` 를 쓰는데,
// 등록 상품이 월(30일)뿐이면 **월 정가를 그대로** 돌려준다(반달은 못 판다).
// 그 값 자체는 「협상 전 참고치」로 저장에 남기고, 보고서 표시는 문서 전체와
// 같은 선형 환산 기준(583만)으로 통일한다. 갈릴 수 있다는 사실은 각주가 상한과
// 함께 밝힌다 — 어느 한 숫자로 단정하지 않는다.

test("저장 totalCostWon 은 월 정가 합으로 남는다 (협상 전 참고치)", () => {
  assert.equal(snapshot().metrics.totalCostWon, MONTHLY_LIST_SUM);
});

test("1p 헤더 '이 구성' 이 매체 라인·예산배분과 같은 기준이다", () => {
  const p = payload();
  assert.equal(
    p.budgetHonesty?.coverValue,
    "요청 예산 ₩30,000,000 / 이 구성 ₩5,833,333 (19%)",
  );
  const splitSum = (p.charts?.budgetSplit ?? []).reduce((s, d) => s + d.value, 0);
  assert.equal(splitSum, PRORATED_SUM);
  assert.equal(
    p.budgetHonesty?.mixWon,
    splitSum,
    "헤더가 저장값(1,250만)으로 돌아가면 1p 와 나머지가 다시 어긋난다",
  );
});

test("반달 상품이 없다는 사실이 각주로 붙고 상한이 월정가 합이다", () => {
  const notice = payload().partialRateNotice;
  assert.ok(notice, "월 단위로만 파는 매체가 있으면 각주가 있어야 한다");
  assert.match(notice, /월 단위로만/);
  assert.match(notice, /1,250만원/, `상한 = ${MONTHLY_LIST_SUM}`);
  // 개발자용 경고 코드가 광고주 문구로 새면 안 된다.
  assert.ok(!notice.includes("MEDIA_NO_PARTIAL_RATE_TIER"));
});

// ── 증상2 수정 — 추천 근거 예산 문구 ────────────────────────────────────────
//
// `budgetMan` 은 캠페인 기간 전체 금액이다. 월 환산(3,000 ÷ 14/30 = 6,429만)을
// 쓰지 않고, 기간 프로라타 견적 합을 요청 예산과 직접 비교한다.

test("추천 근거에 월 환산 예산(6,429만)이 나오지 않는다", () => {
  const lines = payload().recommendRationale?.summaryLines ?? [];
  const budgetLine = lines.find((l) => l.includes("요청 예산"));
  assert.ok(budgetLine, "요청 예산 문구가 있어야 한다");
  assert.ok(!budgetLine.includes("6,429"), `왜곡값 포함: ${budgetLine}`);
  assert.ok(!budgetLine.includes("월 예산"), `월 예산 문구 잔존: ${budgetLine}`);
  assert.equal(
    budgetLine,
    "요청 예산 3,000만원 대비 19.4%(583만원) 활용.",
  );
});

// ── ③ raw · SOV보정 노출 병기 (증상3 구현) ─────────────────────────────────
//
// A-1b Wave 3 이후 기여도는 **저장 스냅샷**(접촉률×SOV 보정)에서 나오고,
// 카드는 여전히 raw 유동인구만 보여줘 순위가 어긋나 보였다. Wave 4 의
// 네트워크 건과 같은 부류(카드 표시 기준 ≠ 집계 기준)다.
//
// 해결 방식은 raw 를 계산에 되돌리는 게 아니라 **병기**다 — `dailyTraffic`
// (raw)과 `adjustedDailyReach`(SOV 보정, 계산 기준과 동일값)를 둘 다
// payload 에 싣는다. 계산 기준은 여전히 SOV 보정값 하나뿐이다.

test("카드에 raw 유동인구와 SOV 보정 실노출이 함께 실린다", () => {
  const p = payload();
  const wunam = row(p, "우남빌딩 전광판");
  assert.equal(wunam.dailyTraffic, 221_286, "raw 는 그대로");
  assert.equal(wunam.adjustedDailyReach, 2_766, "221,286 × 0.0125");

  const hongdae = row(p, "홍대 코너래핑");
  assert.equal(hongdae.dailyTraffic, 42_000);
  assert.equal(hongdae.adjustedDailyReach, 10_500, "42,000 × 0.25");
});

test("기여도 순위는 SOV 보정값 순위와 같고 raw 순위와는 다르다", () => {
  const p = payload();
  const byAdjusted = [...p.portfolio]
    .sort((a, b) => (b.adjustedDailyReach ?? 0) - (a.adjustedDailyReach ?? 0))
    .map((r) => r.name);
  const byContribution = [...p.portfolio]
    .sort(
      (a, b) =>
        (b.exposureContributionPct ?? 0) - (a.exposureContributionPct ?? 0),
    )
    .map((r) => r.name);
  const byRaw = [...p.portfolio]
    .sort((a, b) => (b.dailyTraffic ?? 0) - (a.dailyTraffic ?? 0))
    .map((r) => r.name);

  assert.deepEqual(byContribution, byAdjusted, "기여도는 보정값 기준");
  assert.notDeepEqual(byContribution, byRaw, "raw 기준이면 다시 역전이 생긴다");
});

/**
 * 보강 요청 — raw 병기가 순수 표시 기능이고 계산에 관여하지 않는다는 것 자체를
 * 증명한다. 같은 저장 스냅샷(같은 `impressions`)을 두고 카탈로그의 raw
 * `dailyFootTraffic` 만 임의로 바꿔 재렌더링했을 때, `dailyTraffic`(raw
 * 병기값) 이외의 **모든 계산 결과가 완전히 동일**해야 한다.
 *
 * override 경로(`itemImpressions`)가 살아있는 한 raw 는 `rawDailyFootTraffic`
 * 패스스루로만 쓰이고 `dailyImpressions`/노출/CPM/정렬 계산에는 재도입되지
 * 않는다(engine.ts) — 이 테스트가 그 사실 자체를 지킨다.
 */
test("raw 값을 바꿔도 dailyTraffic 표시 외에는 아무 계산도 안 움직인다", () => {
  const original = payload();

  // 저장 스냅샷은 그대로 두고, 카탈로그의 raw 유동인구만 무작위로 바꾼다
  // (일부러 순서를 뒤집을 만한 값으로 — 계산에 새면 바로 드러나게).
  const skewedCatalog = CATALOG.map((m, i) => ({
    ...m,
    dailyFootTraffic: [999_999, 1, 500_000, 2, 777_777][i],
  }));
  const skewed = buildBriefReportPayload({
    plan: snapshot(),
    catalog: skewedCatalog,
    isKo: true,
  });

  // raw 병기값만 달라져야 한다.
  for (const m of CATALOG) {
    const a = row(original, m.name);
    const b = row(skewed, m.name);
    assert.notEqual(a.dailyTraffic, b.dailyTraffic, `${m.name} raw 는 바뀌어야 한다`);
  }

  // 그 외에는 전부 동일 — 기여도·예산비중·SOV 보정 노출·CPM.
  for (const m of CATALOG) {
    const a = row(original, m.name);
    const b = row(skewed, m.name);
    assert.equal(a.adjustedDailyReach, b.adjustedDailyReach, `${m.name} 보정 노출`);
    assert.equal(a.exposureContributionPct, b.exposureContributionPct, `${m.name} 노출기여`);
    assert.equal(a.budgetContributionPct, b.budgetContributionPct, `${m.name} 예산기여`);
    assert.equal(a.lineTotalLabel, b.lineTotalLabel, `${m.name} 라인 금액`);
  }

  // 1p·4p·상권표 집계, 정렬 순서, 예산 요약 전부 동일.
  const kpiOf = (p: ReturnType<typeof payload>) =>
    p.kpis.find((k) => k.label === "총 예상 노출")?.value;
  assert.equal(kpiOf(original), kpiOf(skewed));
  assert.equal(
    (original.regionSubdivision?.breakdown ?? [])
      .reduce((s, r) => s + r.totalImpressions, 0),
    (skewed.regionSubdivision?.breakdown ?? [])
      .reduce((s, r) => s + r.totalImpressions, 0),
  );
  assert.deepEqual(
    original.portfolio.map((r) => r.name),
    skewed.portfolio.map((r) => r.name),
    "정렬·나열 순서 동일",
  );
  assert.equal(original.budgetHonesty?.coverValue, skewed.budgetHonesty?.coverValue);
  assert.equal(original.partialRateNotice, skewed.partialRateNotice);
});

/**
 * 「총 2면」 같은 복수 면수 — 저장 노출·금액에 이미 반영돼 있는데도 카드에는
 * 수량 표기가 붙지 않고 일일 노출이 1면 값으로 남던 문제(Wave 4 가 네트워크만
 * 고치고 놓친 고정형 판). 이제 저장 수량을 그대로 드러낸다.
 *
 * `isQuantitySelectableMedia` 자체는 건드리지 않았다 — 그 함수는
 * `resolveImpressionsForUnits`·`resolveMediaQuantity` 같은 **계산** 경로도
 * 가르는 스위치라, 판정을 넓히면 표시가 아니라 노출·단가가 움직인다.
 */
function payloadWithUnits(unitsById: Record<string, number>) {
  const plan = buildCampaignPlanSnapshot({
    brief,
    catalog: CATALOG,
    mixUnits: Object.fromEntries(
      CATALOG.map((m) => [m.id, unitsById[m.id] ?? 1]),
    ),
  });
  return buildBriefReportPayload({ plan, catalog: CATALOG, isKo: true });
}

test("고정형 복수 면수가 카드 수량·일일 노출에 반영된다", () => {
  const one = calcLineMetrics({ media: CATALOG[2]!, units: 1 }, FLIGHT_DAYS);
  const two = calcLineMetrics({ media: CATALOG[2]!, units: 2 }, FLIGHT_DAYS);
  assert.equal(two.impressions.value, one.impressions.value * 2, "저장 노출은 2배");
  assert.equal(two.costWon?.value, (one.costWon?.value ?? 0) * 2, "저장 금액도 2배");

  const single = row(payloadWithUnits({}), "홍대 코너래핑");
  assert.equal(single.quantityLabel, undefined, "1면이면 수량 표기를 붙이지 않는다");
  assert.equal(single.dailyTraffic, 42_000);

  const double = row(payloadWithUnits({ n3: 2 }), "홍대 코너래핑");
  assert.equal(double.quantityLabel, "2개", "저장 수량이 카드에 드러나야 한다");
  assert.equal(double.dailyTraffic, 84_000, "일일 노출도 면수 합산이어야 한다");
});

test("수량 변경이 계산이 아니라 표시만 바꾼다 — 기여도 순위는 그대로", () => {
  const order = (p: ReturnType<typeof payload>) =>
    [...p.portfolio]
      .sort(
        (a, b) =>
          (b.exposureContributionPct ?? 0) - (a.exposureContributionPct ?? 0),
      )
      .map((r) => r.name);
  // 같은 저장 스냅샷(units=1)에서 표시 로직만 지난다 — 순위가 흔들리면 안 된다.
  assert.deepEqual(order(payloadWithUnits({})), order(payload()));
});

// ── 이미 맞는 것 — 회귀 방지 ───────────────────────────────────────────────

test("기간 표기가 14일이다", () => {
  assert.match(payload().periodDisplay, /14일/);
});

test("1p 총노출 == 4p 노출 요약 == 저장 총노출", () => {
  const s = snapshot();
  const p = payload();
  const kpi = p.kpis.find((k) => k.label === "총 예상 노출");
  const total = Number(kpi?.value.replace(/[^\d]/g, ""));
  const summary = (p.charts?.reachSummary ?? []).find((d) => d.label === "총 노출");
  assert.equal(total, s.metrics.totalImpressions);
  assert.equal(summary?.value, total);
});

test("상권 세분화 표 합계가 1p 총노출과 닫힌다", () => {
  const p = payload();
  const rows = p.regionSubdivision?.breakdown ?? [];
  assert.ok(rows.length > 0);
  const kpi = p.kpis.find((k) => k.label === "총 예상 노출");
  const total = Number(kpi?.value.replace(/[^\d]/g, ""));
  assert.equal(rows.reduce((s, r) => s + r.totalImpressions, 0), total);
});
