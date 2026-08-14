import assert from "node:assert/strict";
import test from "node:test";
import {
  auditAll,
  auditRow,
  createAccumulator,
  currentMonthlyImpressions,
  distinctiveTokens,
  hasAnySovHint,
  parseDeclaredSellingUnit,
  parseStatedDailyTraffic,
  readPriceOptions,
  topCpmOutliers,
  type AuditMediaRow,
  type RuleId,
} from "../audit-rules";

function row(overrides: Partial<AuditMediaRow> = {}): AuditMediaRow {
  return {
    id: "cmtest0001",
    slug: null,
    name: "테스트 매체",
    type: "static",
    region: "서울",
    regionMain: "서울",
    location: "서울 중구",
    description: null,
    price: 5_000_000,
    pricePeriod: "month",
    priceOptions: null,
    priceNote: null,
    widthM: null,
    heightM: null,
    resolution: null,
    targetAge: null,
    dailyFootfall: 50_000,
    impressions: null,
    cpm: null,
    mediaMainCategory: "ooh",
    mediaSubCategory: "billboard",
    latitude: 37.5,
    tags: [],
    nearbyStations: null,
    nearbyLandmarks: null,
    ...overrides,
  };
}

function rulesFired(r: AuditMediaRow): Set<RuleId> {
  const acc = createAccumulator();
  auditRow(r, acc);
  return new Set(acc.violations.map((v) => v.rule));
}

// ── 파서 ────────────────────────────────────────────────────────

test("본문 유동인구 파싱 — 만/천 단위와 콤마 표기", () => {
  assert.equal(parseStatedDailyTraffic("하루 평균 16만 명이 지나갑니다"), 160_000);
  assert.equal(parseStatedDailyTraffic("일 평균 120,000명"), 120_000);
  assert.equal(parseStatedDailyTraffic("일일 8천 명 수준"), 8_000);
  assert.equal(parseStatedDailyTraffic("설명 없음"), null);
  assert.equal(parseStatedDailyTraffic(null), null);
});

test("판매 단위 파싱 — 대/면/역/노선", () => {
  assert.equal(parseDeclaredSellingUnit(row({ priceNote: "₩80만 (1대)" })), "vehicle");
  assert.equal(parseDeclaredSellingUnit(row({ priceNote: "면당 300만원" })), "panel");
  assert.equal(parseDeclaredSellingUnit(row({ priceNote: "1개역 기준" })), "station");
  assert.equal(parseDeclaredSellingUnit(row({ priceNote: "노선 전체" })), "route");
  assert.equal(parseDeclaredSellingUnit(row({ priceNote: "협의" })), null);
});

test("SOV 근거 탐지 — 초·loop·시간당 재생", () => {
  assert.equal(hasAnySovHint(row({ priceNote: "15초 소재 / 300초 loop" })), true);
  assert.equal(hasAnySovHint(row({ description: "시간당 4회 보장" })), true);
  assert.equal(hasAnySovHint(row({ priceNote: "월 단가" })), false);
});

test("priceOptions 파싱 — period 를 일수로 정규화", () => {
  const opts = readPriceOptions(
    row({
      price: 25_000_000,
      pricePeriod: "week",
      priceOptions: [
        { label: "1개월", price: 70_000_000, period: "month" },
        { label: "잘못된 옵션", price: 0, period: "month" },
        { label: "기간 미상", price: 1_000, period: "quarter" },
      ],
    }),
  );
  assert.deepEqual(
    opts.map((o) => [o.days, o.price]),
    [
      [7, 25_000_000],
      [30, 70_000_000],
    ],
  );
});

test("현행 월 노출 — impressions 우선, 없으면 일 유동 × 30", () => {
  assert.equal(currentMonthlyImpressions(row({ impressions: 2_200_000 })), 2_200_000);
  assert.equal(
    currentMonthlyImpressions(row({ impressions: null, dailyFootfall: 50_000 })),
    1_500_000,
  );
});

// ── R-01 인구 상한 ──────────────────────────────────────────────

test("R-01: 버스 1대에 노선 전체 유동인구가 붙으면 잡힌다 (D-02)", () => {
  const fired = rulesFired(
    row({
      name: "서울 버스 외부광고",
      type: "mobile",
      mediaMainCategory: "transit",
      mediaSubCategory: "bus_exterior",
      priceNote: "₩80만 (1대)",
      price: 800_000,
      dailyFootfall: 9_400_000,
      impressions: 38_000_000,
    }),
  );
  assert.ok(fired.has("R-01"), "R-01 미탐지");
  assert.ok(fired.has("R-05"), "R-05 미탐지 — 1대 가격 vs 노선 노출");
});

test("R-01: 저장 월 노출이 일 유동인구 × 30 × 4 상한을 넘으면 잡힌다", () => {
  const fired = rulesFired(
    row({ dailyFootfall: 50_000, impressions: 30_000_000 }),
  );
  assert.ok(fired.has("R-01"));
});

test("R-01: 정상 범위 매체는 잡히지 않는다", () => {
  const fired = rulesFired(
    row({ dailyFootfall: 50_000, impressions: 1_500_000 }),
  );
  assert.equal(fired.has("R-01"), false);
});

// ── R-02 CPM ────────────────────────────────────────────────────

test("R-02: 버스 CPM ₩32 는 단위 오류로 분류된다 (D-02)", () => {
  const acc = createAccumulator();
  auditRow(
    row({
      name: "서울 버스 외부광고",
      type: "mobile",
      mediaMainCategory: "transit",
      mediaSubCategory: "bus_exterior",
      price: 800_000,
      dailyFootfall: 1_266_667,
      impressions: 38_000_000,
    }),
    acc,
  );
  const r02 = acc.violations.find((v) => v.rule === "R-02");
  assert.ok(r02, "R-02 미탐지");
  assert.equal(r02.detail?.unitError, true);
  assert.ok(r02.message.includes("단위 오류"));
});

test("R-02: 정상 CPM 은 잡히지 않는다", () => {
  // static_other 정상 범위 1,500~45,000 → CPM 10,000
  const fired = rulesFired(
    row({ price: 15_000_000, impressions: 1_500_000, dailyFootfall: 50_000 }),
  );
  assert.equal(fired.has("R-02"), false);
});

test("R-02: 범위 상단 이탈도 잡는다", () => {
  const fired = rulesFired(
    row({ price: 500_000_000, impressions: 1_500_000, dailyFootfall: 50_000 }),
  );
  assert.ok(fired.has("R-02"));
});

// ── R-03 기간 환산 ──────────────────────────────────────────────

test("R-03: 주 단가 선형 환산이 실제 월 상품가와 어긋나면 잡힌다 (D-04)", () => {
  const acc = createAccumulator();
  auditRow(
    row({
      price: 25_000_000,
      pricePeriod: "week",
      priceOptions: [{ label: "1개월", price: 70_000_000, period: "month" }],
    }),
    acc,
  );
  const r03 = acc.violations.find((v) => v.rule === "R-03");
  assert.ok(r03, "R-03 미탐지");
  // 25,000,000 / 7 × 30 = 107,142,857 → +53%
  assert.ok((r03.detail?.deviation as number) > 0.5);
});

test("R-03: 월 상품가가 선형 환산과 일치하면 잡히지 않는다", () => {
  const fired = rulesFired(
    row({
      price: 10_000_000,
      pricePeriod: "week",
      priceOptions: [
        { label: "1개월", price: (10_000_000 / 7) * 30, period: "month" },
      ],
    }),
  );
  assert.equal(fired.has("R-03"), false);
});

// ── R-04 SOV ────────────────────────────────────────────────────

test("R-04: loop 매체에 SOV 근거가 없으면 잡힌다 (D-01)", () => {
  const fired = rulesFired(
    row({
      name: "M-CITY",
      type: "digital",
      mediaMainCategory: "ooh",
      mediaSubCategory: "digital_signage",
    }),
  );
  assert.ok(fired.has("R-04"));
});

test("R-04: SOV 근거가 있으면 잡히지 않는다", () => {
  const fired = rulesFired(
    row({
      type: "digital",
      mediaSubCategory: "digital_signage",
      priceNote: "15초 소재 / 300초 loop 기준",
    }),
  );
  assert.equal(fired.has("R-04"), false);
});

test("R-04: 정적 매체(빌보드·버스 래핑)는 SOV 대상이 아니다", () => {
  assert.equal(rulesFired(row({ mediaSubCategory: "billboard" })).has("R-04"), false);
  assert.equal(
    rulesFired(row({ type: "mobile", mediaSubCategory: "bus_exterior" })).has("R-04"),
    false,
  );
});

// ── R-06 본문 괴리 ──────────────────────────────────────────────

test("R-06: 본문 16만 명 vs 데이터 5만 명 괴리를 잡는다", () => {
  const fired = rulesFired(
    row({ description: "하루 평균 16만 명이 방문합니다.", dailyFootfall: 50_000 }),
  );
  assert.ok(fired.has("R-06"));
});

test("R-06: ±30% 이내면 잡지 않는다", () => {
  const fired = rulesFired(
    row({ description: "하루 평균 16만 명", dailyFootfall: 150_000 }),
  );
  assert.equal(fired.has("R-06"), false);
});

test("R-06: 본문 서술은 있는데 데이터가 없으면 잡는다", () => {
  const fired = rulesFired(
    row({ description: "하루 평균 16만 명", dailyFootfall: null }),
  );
  assert.ok(fired.has("R-06"));
});

// ── R-07 필드 결손 ──────────────────────────────────────────────

test("R-07: 결손 필드를 세고, 스키마에 없는 필드는 전건 카운트한다", () => {
  const acc = createAccumulator();
  auditRow(row({ resolution: null, targetAge: null }), acc);
  assert.ok(acc.fieldGaps.resolution >= 1);
  assert.ok(acc.fieldGaps.targetAge >= 1);
  // PR-3 에서 추가될 필드는 항상 100% 결손
  assert.equal(acc.fieldGaps.demoGenderSplit, 1);
  assert.equal(acc.fieldGaps.coveragePopulation, 1);
  assert.equal(acc.fieldGaps.loopDuration, 1);
});

test('R-07: resolution "문의 시 안내" 는 결손으로 센다 (D-10)', () => {
  const acc = createAccumulator();
  auditRow(row({ resolution: "문의 시 안내" }), acc);
  assert.equal(acc.fieldGaps.resolution, 1);
});

// ── R-08 / R-09 교차 검사 ───────────────────────────────────────

test("R-08: slug 가 있는 매체는 두 URL 로 접근 가능 — 중복 URL 로 잡는다 (D-17)", () => {
  const acc = auditAll([
    row({ id: "cmnzdtqyf001", slug: "euljiro-media" }),
    row({ id: "cmnzdtqyf002", slug: null }),
  ]);
  const r08 = acc.violations.filter((v) => v.rule === "R-08");
  assert.equal(r08.length, 1);
  assert.equal(r08[0].slug, "euljiro-media");
});

test("R-09: 타 매체 고유명사가 태그에 섞이면 잡는다 (D-18)", () => {
  const acc = auditAll([
    row({
      id: "bus-001",
      name: "서울 시내버스 외부광고",
      location: "서울 전역",
      tags: ["롯데백화점본점", "AQ테일러", "버스광고"],
    }),
    row({ id: "dept-001", name: "롯데백화점본점 외벽", location: "서울 중구" }),
    row({ id: "shop-001", name: "AQ테일러 매장 사이니지", location: "서울 강남" }),
  ]);
  const r09 = acc.violations.filter((v) => v.rule === "R-09");
  assert.equal(r09.length, 1);
  assert.equal(r09[0].mediaId, "bus-001");
  const foreign = r09[0].detail?.foreign as string[];
  assert.deepEqual(foreign.sort(), ["AQ테일러", "롯데백화점본점"]);
});

test("R-09: 자기 지역·자기 이름 토큰은 혼입이 아니다", () => {
  const acc = auditAll([
    row({
      id: "m-1",
      name: "을지로 전광판",
      location: "서울 중구 을지로",
      tags: ["을지로", "서울"],
    }),
    row({ id: "m-2", name: "을지로 미디어폴", location: "서울 중구 을지로" }),
  ]);
  assert.equal(acc.violations.filter((v) => v.rule === "R-09").length, 0);
});

test("R-09: 흔한 토큰(3개 초과 매체 공유)은 고유명사로 보지 않는다", () => {
  const rows = ["a", "b", "c", "d"].map((i) =>
    row({ id: `x-${i}`, name: `강남대로 매체 ${i}`, location: "서울 강남" }),
  );
  rows.push(row({ id: "y-1", name: "부산 매체", location: "부산", tags: ["강남대로"] }));
  const acc = auditAll(rows);
  assert.equal(acc.violations.filter((v) => v.rule === "R-09").length, 0);
});

// ── 집계 ────────────────────────────────────────────────────────

test("distinctiveTokens — 일반 매체 유형어는 제외한다", () => {
  const tokens = distinctiveTokens("코엑스 K-POP 스퀘어 전광판");
  assert.ok(tokens.includes("코엑스"));
  assert.equal(tokens.includes("전광판"), false);
  assert.equal(tokens.includes("스퀘어"), false);
});

test("topCpmOutliers — 이탈 배수 내림차순, 정상 매체는 제외", () => {
  const bounds = [1_500, 12_000] as const;
  const base = {
    slug: null,
    mediaClass: "bus_exterior" as const,
    bounds,
    monthlyImpressions: 1_000,
    price: 1_000,
  };
  const outliers = topCpmOutliers([
    { ...base, mediaId: "a", name: "정상", currentCpm: 5_000 },
    { ...base, mediaId: "b", name: "하단 이탈", currentCpm: 32 },
    { ...base, mediaId: "c", name: "상단 이탈", currentCpm: 24_000 },
    { ...base, mediaId: "d", name: "값 없음", currentCpm: null },
  ]);
  assert.deepEqual(
    outliers.map((o) => o.mediaId),
    ["b", "c"],
  );
  assert.ok(outliers[0].ratio > outliers[1].ratio);
});

test("auditAll 은 순수 — 같은 입력이면 같은 리포트", () => {
  const rows = [
    row({ id: "a", slug: "a-slug", type: "digital", mediaSubCategory: "digital_signage" }),
    row({ id: "b", dailyFootfall: 9_400_000, impressions: 38_000_000 }),
  ];
  const first = auditAll(rows);
  const second = auditAll(rows);
  assert.deepEqual(first.violations, second.violations);
  assert.deepEqual(first.fieldGaps, second.fieldGaps);
});

test("모든 규칙에 severity 와 라벨이 정의되어 있다", () => {
  const acc = auditAll([row({ slug: "s", type: "digital", mediaSubCategory: "digital_signage" })]);
  for (const v of acc.violations) {
    assert.ok(["P0", "P1", "P2"].includes(v.severity), v.rule);
    assert.ok(v.message.length > 0, v.rule);
    assert.ok(v.mediaId.length > 0);
  }
});

// ── R-5 심화: 라벨 vs period 불일치 (M-CITY 근본 원인 탐지) ──

import { parseLabelDays } from "../audit-rules";

test("R-05b: priceOption 라벨 파싱 — 일/주/개월", () => {
  assert.equal(parseLabelDays("7일"), 7);
  assert.equal(parseLabelDays("1개월"), 30);
  assert.equal(parseLabelDays("2주"), 14);
  assert.equal(parseLabelDays("1 week"), 7);
  assert.equal(parseLabelDays("20초 기준"), null);
  assert.equal(parseLabelDays(null), null);
});

test('R-05b: "1개월" 라벨 + period="day" — 30배 오라벨 감지 (M-CITY 근본 원인)', () => {
  const acc = createAccumulator();
  auditRow(
    row({
      name: "M-CITY",
      type: "digital",
      mediaSubCategory: "digital_signage",
      price: 70_000_000,
      pricePeriod: "day",
      priceOptions: [
        { label: "1개월", price: 70_000_000, period: "day" },
      ],
    }),
    acc,
  );
  const r05 = acc.violations.filter((v) => v.rule === "R-05");
  assert.ok(r05.length >= 1, "R-05 미탐지");
  const labelMismatch = r05.find(
    (v) => v.detail?.labelDays === 30 && v.detail?.periodDays === 1,
  );
  assert.ok(labelMismatch, "라벨(30일) vs period(1일) 매칭 실패");
  assert.ok(labelMismatch.message.includes("30배 틀린다") ||
            labelMismatch.message.includes("다른 값을 낸다"));
});

test("R-05b: 라벨과 period 가 일치하면 잡히지 않는다", () => {
  const acc = createAccumulator();
  auditRow(
    row({
      priceOptions: [
        { label: "7일", price: 25_000_000, period: "week" },
        { label: "1개월", price: 70_000_000, period: "month" },
      ],
    }),
    acc,
  );
  const labelHits = acc.violations.filter(
    (v) => v.rule === "R-05" && v.detail?.labelDays,
  );
  assert.equal(labelHits.length, 0);
});

test('R-05c: 매체명에 "1개월" 인데 pricePeriod="day" — 감지', () => {
  const acc = createAccumulator();
  auditRow(
    row({
      name: "강남대로 1개월 상시 노출",
      pricePeriod: "day",
      price: 5_000_000,
    }),
    acc,
  );
  const nameMismatch = acc.violations.find(
    (v) => v.rule === "R-05" && v.detail?.nameDays === 30,
  );
  assert.ok(nameMismatch, "R-05c 미탐지");
});

// ── R-7 base row 단독 매체 감지 ──

test("R-7: priceOptions 비어 있고 base row 만 있는 매체는 감지 대상", () => {
  const acc = createAccumulator();
  auditRow(
    row({
      name: "M-CITY (가정)",
      priceOptions: null,
      price: 70_000_000,
      pricePeriod: "day",
    }),
    acc,
  );
  const baseOnly = acc.violations.find(
    (v) => v.rule === "R-05" && v.detail?.baseOnly === true,
  );
  assert.ok(baseOnly, "R-7 미탐지");
  assert.equal(baseOnly.detail?.riskyPeriod, true, "day 라벨은 고위험으로 표기");
  assert.ok(baseOnly.message.includes("base 폐기 안전망이 없어"));
});

test("R-7: 명시 옵션이 하나라도 있으면 R-7 은 잡지 않는다", () => {
  const acc = createAccumulator();
  auditRow(
    row({
      priceOptions: [{ label: "1개월", price: 70_000_000, period: "month" }],
      price: 70_000_000,
      pricePeriod: "day",
    }),
    acc,
  );
  const baseOnly = acc.violations.find(
    (v) => v.rule === "R-05" && v.detail?.baseOnly === true,
  );
  assert.equal(baseOnly, undefined);
});

test("R-7: month 라벨 base-only 는 위험도 낮음으로 표기", () => {
  const acc = createAccumulator();
  auditRow(
    row({ priceOptions: null, price: 5_000_000, pricePeriod: "month" }),
    acc,
  );
  const baseOnly = acc.violations.find(
    (v) => v.rule === "R-05" && v.detail?.baseOnly === true,
  );
  assert.ok(baseOnly);
  assert.equal(baseOnly.detail?.riskyPeriod, false);
});

test("R-7: 유효하지 않은 옵션(0원 등)만 있으면 base-only 로 취급", () => {
  const acc = createAccumulator();
  auditRow(
    row({
      priceOptions: [{ label: "무효", price: 0, period: "month" }],
      price: 5_000_000,
      pricePeriod: "day",
    }),
    acc,
  );
  const baseOnly = acc.violations.find(
    (v) => v.rule === "R-05" && v.detail?.baseOnly === true,
  );
  assert.ok(baseOnly, "0원짜리 rogue 옵션이 안전망을 만들지 않아야 한다");
});
