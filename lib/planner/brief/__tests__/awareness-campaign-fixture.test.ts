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

// ── 현행 불일치 ② — 추천 근거의 정체불명 숫자 ──────────────────────────────
//
// `computePlannerPortfolioBudgetStatus` 가 `budgetMan / months` 로 요청 예산을
// 월 환산한다. 14일 총액 3,000만이 월 6,429만으로 부풀고, 비교 대상인
// `monthlyTotalMan` 은 기간 미반영 월 정가 합(1,250만)이다. 문서 어디에도
// 없는 두 숫자가 한 문장에 함께 나온다.

test("[현행 불일치] 추천 근거에 월 환산 예산(6,429만)이 등장한다", () => {
  const line = (payload().recommendRationale?.summaryLines ?? []).find((l) =>
    l.includes("월 예산"),
  );
  assert.equal(line, "월 예산 6,429만원 대비 19.4%(1,250만원) 활용.");
  assert.equal(Math.round(3000 / (FLIGHT_DAYS / 30)), 6429, "3,000만 ÷ (14/30)");
});

// ── 현행 불일치 ③ — 카드 일일노출과 노출기여 순위 역전 ─────────────────────
//
// A-1b Wave 3 이후 기여도는 **저장 스냅샷**(접촉률×SOV 보정)에서 나오고,
// 카드 `dailyTraffic` 은 여전히 **raw 유동인구**다. 유형별 20배 보정 차이가
// 그대로 순위 역전으로 보인다. Wave 4 의 네트워크 건과 같은 부류
// (카드 표시 기준 ≠ 집계 기준)이며, 그때 네트워크만 고치고 이쪽은 남았다.

test("[현행 불일치] 일일노출 1위가 기여도 3위로 밀린다", () => {
  const p = payload();
  assert.equal(row(p, "우남빌딩 전광판").dailyTraffic, 221_286);
  assert.equal(Math.round(row(p, "우남빌딩 전광판").exposureContributionPct ?? 0), 12);
  assert.equal(row(p, "홍대 코너래핑").dailyTraffic, 42_000);
  assert.equal(Math.round(row(p, "홍대 코너래핑").exposureContributionPct ?? 0), 45);
});

test("[현행 불일치] 카드 일일노출 순위와 기여도 순위가 다르다", () => {
  const p = payload();
  const byDaily = [...p.portfolio]
    .sort((a, b) => (b.dailyTraffic ?? 0) - (a.dailyTraffic ?? 0))
    .map((r) => r.name);
  const byContribution = [...p.portfolio]
    .sort(
      (a, b) =>
        (b.exposureContributionPct ?? 0) - (a.exposureContributionPct ?? 0),
    )
    .map((r) => r.name);
  assert.notDeepEqual(
    byDaily,
    byContribution,
    "두 순위가 같아지면 ③ 이 해결된 것 — 기대값을 교체할 것",
  );
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
